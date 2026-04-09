import User from "../models/user.model.js";
import AppError from "../utils/error.util.js";
import cloudinary from "cloudinary";
import fs from 'fs/promises';
import sendEmail from "../utils/sendEmail.js";
import crypto from 'crypto';

const cookieOptions = {
    maxAge: 7*24*60*60*1000, // 7 days
    httpOnly: true, // JavaScript cannot access the cookie
    secure: true // Protects against XSS (Cross-Site Scripting) attacks : if a hacker injects JS into your site, they cannot steal this cookie
}

const register = async(req,res,next) => {
    const {fullName, email, password} = req.body;

    if (!fullName || !email || !password) {
        return next(new AppError('All fields are required', 400));
    }

    // There are two ways to check user exist or not. This is second. First is in 4.express/5.js
    const userExists = await User.findOne({email});
    if(userExists){
        return next(new AppError('Email already exists',400));
    }

    // Here we use again second method to create user and save to DB
    const user = await User.create({
        fullName,
        email,
        password,
        avatar: {
            public_id: email,
            secure_url: 'cloudinary url '
        }
    });

    if(!user){
        return next(new AppError('User registration failed, please try again', 400));
    }

    // File Upload
    // Run only if user sends a file
    if (req.file) {
        try {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'lms', // Save files in a folder named lms
                width: 250,
                height: 250,
                gravity: 'faces', // This option tells cloudinary to center the image around detected faces (if any) after cropping or resizing the original image
                crop: 'fill',
            });

            // If success
            if (result) {
                // Set the public_id and secure_url in DB
                user.avatar = {
                    public_id: result.public_id,
                    secure_url: result.secure_url
                };

                // After successful upload remove the file from local storage
                await fs.rm(req.file.path);
            }
        } 
        catch (e) {
            return next(
                new AppError(e.message || 'File not uploaded, please try again', 400)
            );
        }
    }

    await user.save(); // saving in DB

    user.password = undefined; 

    const token = await user.generateJWTToken();

    res.cookie('token',token,cookieOptions)

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user, // send user info but not password. So, undefined.
    });
};

const login = async (req,res,next) => {
    try{
        const {email, password} = req.body;
    
        if(!email || !password){
            return next(new AppError('All fields are required', 400));
        }
    
        const user = await User.findOne({
            email
        }).select('+password'); // asking explicitly bcoz in "user.model.js" we seted password:{select:false}
    
        if (!user) {
            return next(new AppError('Email or password does not match', 400));
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return next(new AppError('Email or password does not match', 400));
        }
    
        const token = await user.generateJWTToken();
        user.password = undefined;
    
        res.cookie('token', token, cookieOptions);
    
        res.status(200).json({
            success: true,
            message: 'User loggedin successfully',
            user,
        });
    } 
    catch(e){
        return next(new AppError(e.message,500)); // This tells Express: “Something went wrong — skip normal middleware and go to error-handling middleware”
    }
};

const logout = (req,res,next) => {
    res.cookie('token',null, {
        secure: true,
        maxAge: 0,
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'User logged out successfully'
    });
};

const getProfile = async(req,res,next) => {
    try{
        const userId = req.user.id;
        const user = await User.findById(userId);

        res.status(200).json({
            success: true,
            message: 'User details',
            user
        });
    } catch(e){
        return next(new AppError('Failed to fetch profile detail'));
    }

};

const forgotPassword = async (req,res,next) => {
    const {email} = req.body;

    if(!email){
        return next(new AppError('Email is required', 400));
    }

    const user = await User.findOne({email});
    if(!user){
        return next(new AppError('Email not registered', 400));
    }

    const resetToken = user.generatePasswordResetToken();

    await user.save({ validateBeforeSave: false }); // It tells Mongoose: “Bro, I know what I’m doing — don’t validate everything, just save.” Otherwise, it will check fullName, mail, password etc.
    const resetPasswordURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // We here need to send an email to the user with the token
    const subject = 'Reset Password';
    const message = `You can reset your password by clicking <a href=${resetPasswordURL} target="_blank"> Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordURL}.\n If you have not requested this, kindly ignore.`;

    try{
        await sendEmail(email, subject, message);

        res.status(200).json({
            success: true,
            message: `Reset password token has been sent to ${email} successfully`
        })
        
    } catch(err){
        // if fail then no need to store token in db
        user.forgotPasswordExpiry = undefined;
        user.forgotPasswordToken = undefined;

        await user.save({ validateBeforeSave: false }); // update the database with the changes you made

        return next(new AppError(err.message, 500));
    }
};

const resetPassword = async (req,res,next) => {
    try{
        const {resetToken} = req.params; // req.params => These values come from the URL path, not from body or query.
        const {password} = req.body; // body -> user gives us as input
    
        if (!password) { // *added by me, after server crash
            return res.status(400).json({
                success: false,
                message: "Please provide a new password"
            });
        }
    
        const forgotPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
    
        const user = await User.findOne({
            forgotPasswordToken,
            forgotPasswordExpiry: { $gt: Date.now() } // expiry of token present in DB should greater than now otherwise it's expired
        });
    
        if(!user){
            return next(
                new AppError('Token is invalid or expired, please try again',400)
            )
        }
    
        user.password = password;
        user.forgotPasswordToken = undefined;
        user.forgotPasswordExpiry = undefined;
    
        user.save();
    
        res.status(200).json({
            success: true,
            message: 'Password changed successfully!'
        })
    } 
    catch(e){
        return next(new AppError(err.message, 500));
    }
};

const changePassword = async(req,res,next) => {
    const {oldPassword, newPassword} = req.body;
    const {id} = req.user;

    if(!oldPassword || !newPassword){
        return next(
            new AppError('All fields are mandatory',400)
        )
    }

    const user = await User.findById(id).select('+password');

    if(!user){
        return next(
            new AppError('User does not exist', 400)
        )
    }

    const isPasswordValid = await user.comparePassword(oldPassword);

    if(!isPasswordValid){
        return next(
            new AppError('Invalid old password',400)
        )
    }

    user.password = newPassword;

    await user.save();

    user.password = undefined;

    res.status(200).json({
        success: true,
        message: 'Password changed successfully!'
    });
};

export const updateUser = async (req, res, next) => {
  // Destructuring the necessary data from the req object
  const { fullName } = req.body;
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError('Invalid user id or user does not exist'));
  }

  if (fullName) {
    user.fullName = fullName;
  }

  // Run only if user sends a file
  if (req.file) {
    // Deletes the old image uploaded by the user
    await cloudinary.v2.uploader.destroy(user.avatar.public_id);

    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: 'lms', // Save files in a folder named lms
        width: 250,
        height: 250,
        gravity: 'faces', // This option tells cloudinary to center the image around detected faces (if any) after cropping or resizing the original image
        crop: 'fill',
      });

      // If success
      if (result) {
        // Set the public_id and secure_url in DB
        user.avatar.public_id = result.public_id;
        user.avatar.secure_url = result.secure_url;

        // After successful upload remove the file from local storage
        fs.rm(`uploads/${req.file.filename}`);
      }
    } catch (error) {
      return next(
        new AppError(error || 'File not uploaded, please try again', 400)
      );
    }
  }

  // Save the user object
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User details updated successfully',
  });
};

export{
    register,
    login,
    logout,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    // updateUser
}


