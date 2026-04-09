import {Schema, model} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userSchema = new Schema({
    fullName:{
        type: String,
        required: [true, 'User name is required'],
        minLength: [5, 'Name must be atleast 5 char'],
        maxLength: [50, 'Name must be less than 50 char'],
        lowercase: true,
        trim: true
    },
    email:{
        type: String,
        required: [true, 'User email is required'],
        lowercase: true,
        unique: [true, 'Email already registered'],
        trim: true,
        match: [/^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/, 'Please fill a valid email address'] // regex
    },
    password:{
        type: String,
        select: false, // It hides the password from queries (and hence from users via API)
        required: [true, 'Password is required'],
        minLength: [8, 'Password must be atleast 8 characters'],
    },
    avatar:{
        public_id:{
            type: String,
        },
        secure_url:{
            type: String,
        }
    },
    role:{
        type: String,
        enum: ['USER', 'ADMIN'],
        default: 'USER',
    },
    forgotPasswordToken: {
        type: String,
    },
    forgotPasswordExpiry: {
        type: Date,
    },
    subscription: {
        id: String,
        status: String 
    }

}, {
    timestamps: true 
});

userSchema.pre('save', async function (next) {
    // If password is not modified then do not hash it
    if (!this.isModified('password')) return;

    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods = {
    generateJWTToken: function(){ 
        return jwt.sign(
            {id:this._id, email:this.email, subscription:this.subscription, role:this.role},
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRY,
            }
        )
    },
    comparePassword: async function(plainTextPassword){
        return await bcrypt.compare(plainTextPassword, this.password);
    },
    generatePasswordResetToken: function () {
        // generate token
        const resetToken = crypto.randomBytes(20).toString('hex'); // crypto is a built-in module in Node.js

        // It converts the original reset token into a secure hashed version and stores that instead of saving the original token.
        this.forgotPasswordToken = crypto 
            .createHash('sha256')
            .update(resetToken)
            .digest('hex')
        ;
        this.forgotPasswordExpiry = Date.now() + 15*60*1000; // 15min from now

        return resetToken;
    }
}

const User = model('User',userSchema); // create collection (table) by named "users"

export default User; 