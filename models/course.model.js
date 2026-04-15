import {model, Schema} from 'mongoose';

const courseSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        minLength: [8, 'Title should be atleast 8 length'],
        maxLength: [59, 'Title should be less than 60 characters'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        minLength: [8, 'Description should be atleast 8 length'],
        maxLength: [119, 'Description should be less than 120 characters'],
    },
    category: {
        type: String,
        required: [true, 'Catagory is required'],
    },
    thumbnail: {
        public_id: {
            type: String,
            required: true
        },
        secure_url:{
            type: String,
            required: true
        }
    },
    lectures: [
        {
            title: String,
            description: String,
            lecture: { // lecture thumbnail
                public_id: {
                    type: String,
                    required: true
                },
                secure_url:{
                    type: String,
                    required: true
                }
            }
        }
    ],
    numberOfLectures:{
        type: String,
        default: 0
    },
    createdBy:{
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Course = model('Course', courseSchema);

export default Course;