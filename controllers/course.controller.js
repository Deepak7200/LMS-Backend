import Course from "../models/course.model.js"
import AppError from "../utils/error.util.js";
import fs from 'fs/promises';
import cloudinary from 'cloudinary';

const getAllCourses = async(req,res,next) => {
    try{
        const courses = await Course.find({}).select('-lectures'); // select only course, lectures removed
    
        res.status(200).json({
            success: true,
            message: 'All courses',
            courses,
        });
    } 
    catch(err){
        return next(
            new AppError(err.message, 400)
        )
    }
};

const getLecturesByCourseId = async function(req,res,next) {
    try{
        const {id} = req.params;
        const course = await Course.findById(id);

        res.status(200).json({
            success: true,
            message: 'Course lectures fetched successfully',
            lectures: course.lectures
        })
    }
    catch(err){
        return next(
            new AppError(err.message, 400)
        )
    }
};

const createCourse = async(req,res,next) => {
    const {title, description, category, createdBy} = req.body;

    if(!title || !description || !category || !createdBy){
        return next(
            new AppError('All fields are required',400)
        )
    } 

    const course = await Course.create({
        title,
        description,
        category,
        createdBy,
        thumbnail: {
            public_id: 'Dummy',
            secure_url: 'Dummy'
        },
    });

    if(!course){
        return next(
            new AppError('Course could not created, please try again',400)
        )
    }

    if(req.file){
        try{
            const result = await cloudinary.v2.uploader.upload(req.file.path, { // 1. uploading a file to Cloudinary. Cloudinary returns a response object (result) containing: public_id, secure_url, many other metadata
                folder : 'lms'
            });

            if(result){
                course.thumbnail.public_id = result.public_id; // (a unique id) use in Deleting image later, Updating image
                course.thumbnail.secure_url = result.secure_url;
            }
    
            fs.rm(`uploads/${req.file.filename}`); // 3. deleting file from uploads
        }
        catch(err){
            // Delete only the uploaded file from uploads (just for extra safety if exist)
            if (req.file) {
                try {
                    await fs.unlink(req.file.path);
                } 
                catch (err) {
                    console.error('File cleanup failed:', err);
                }
            }

            // Send the error message
            return next(
                new AppError(JSON.stringify(err) || 'File not uploaded, please try again',400)
            );
        }
    }

    await course.save();

    res.status(200).json({
        success: true,
        message: 'Course created successfully',
        course
    })
}

const updateCourse = async(req,res,next) => {
    try{
        const {id} = req.params;
        const course = await Course.findByIdAndUpdate(
            id,
            {
                $set: req.body // This will only update the fields which are present
            },
            {
                runValidators: true // check format of new data is according to defined schema or not
            }
        );

        if(!course){
            return next(
                new AppError('Course with given id does not exist', 500)
            )
        }

        res.status(200).json({
            success: true,
            message: 'Course updated successfully!',
            course
        })
    } 
    catch(e){
        return next(
            new AppError(e.message, 400)
        )
    }
}

const removeCourse = async(req,res,next) => {
    try{
        const {id} = req.params;
        const course = await Course.findById(id);

        if(!course){
            return next(
                new AppError('Course with given id does not exist', 500)
            )
        }

        await Course.findByIdAndDelete(id); // mongo method

        res.status(200).json({
            success: true,
            message: 'Course deleted successfully!',
            course
        })
    }
    catch(e){
        return next(
            new AppError(e.message, 400)
        )
    }
}

const addLectureToCourseById = async(req,res,next) => {
    try{
        const {title, description} = req.body;
        const {id} = req.params;
     
        if(!title || !description){
            return next(
                new AppError('All fields are required', 400)
            )
        }
    
        const course = await Course.findById(id);
    
        if(!course){
            return next(
                new AppError('Course with given id does not exist', 500)
            )
        }
    
        const lectureData = {
            title,
            description,
            lecture: {}
        };
    
        if(req.file){
            try{
                const result = await cloudinary.v2.uploader.upload(req.file.path, { // 1. uploading a file to Cloudinary. Cloudinary returns a response object (result) containing: public_id, secure_url, many other metadata
                    folder : 'lms',
                    resource_type: 'video'
                });
    
                if(result){
                    lectureData.lecture.public_id = result.public_id; // (a unique id) use in Deleting image later, Updating image
                    lectureData.lecture.secure_url = result.secure_url;
                }
        
                fs.rm(`uploads/${req.file.filename}`); // 3. deleting file from uploads
            }
            catch(err){
                // Delete only the uploaded file from uploads (just for extra safety if exist)
                if (req.file) {
                    try {
                        await fs.unlink(req.file.path);
                    } 
                    catch (err) {
                        console.error('File cleanup failed:', err);
                    }
                }
    
                // Send the error message
                return next(
                    new AppError(JSON.stringify(err) || 'File not uploaded, please try again',400)
                );
            }
        }
    
        course.lectures.push(lectureData);
    
        course.numberOfLectures = course.lectures.length;
    
        await course.save();
    
        res.status(200).json({
            success: true,
            message: 'Lecture successfully added to the course',
            course
        })
    }
    catch(e){
        return next(
            new AppError(e.message, 500)
        )
    }
}

const removeLectureFromCourse = async (req, res, next) => {
    // Grabbing the courseId and lectureId from req.query
    const { courseId, lectureId } = req.query;

    // Checking if both courseId and lectureId are present
    if (!courseId) {
        return next(new AppError('Course ID is required', 400));
    }

    if (!lectureId) {
        return next(new AppError('Lecture ID is required', 400));
    }

    // Find the course using the courseId
    const course = await Course.findById(courseId);

    // If no course send custom message
    if (!course) {
        return next(new AppError('Invalid ID or Course does not exist.', 404));
    }

    // Find the index of the lecture using the lectureId
    const lectureIndex = course.lectures.findIndex(
        (lecture) => lecture._id.toString() === lectureId.toString() // lecture perameter is create by findIndex for each lecture to check. And in database "id" save as "_id"
    );

    // If returned index is -1 then send error as mentioned below
    if (lectureIndex === -1) {
        return next(new AppError('Lecture does not exist.', 404));
    }

    // Delete the lecture from cloudinary
    await cloudinary.v2.uploader.destroy(
        course.lectures[lectureIndex].lecture.public_id,
        {
        resource_type: 'video',
        }
    );

    // Remove the lecture from the array
    course.lectures.splice(lectureIndex, 1);

    // update the number of lectures based on lectres array length
    course.numberOfLectures = course.lectures.length;

    // Save the course object
    await course.save();

    // Return response
    res.status(200).json({
        success: true,
        message: 'Course lecture removed successfully',
    });
};

export {
    getAllCourses,
    getLecturesByCourseId,
    createCourse,
    updateCourse,
    removeCourse,
    addLectureToCourseById,
    removeLectureFromCourse
}