
import mongoose from 'mongoose';
mongoose.connect(process.env.DSN);

// userschema
const UserSchema = new mongoose.Schema({

    username: {type: String, required: true, unique: true},
    hash: {type: String, required: true},
    admin: {type: Boolean, required: true, default: false},
    
    events: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}]

});


// event schema
const EventSchema = new mongoose.Schema({

    title: {type: String, required: true},
    date: {type: Date, required: true},
    venue: {type: String, required: true},
    description: {type: String, required: true},
    price: {type: Number, required: true},

    participants: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    numUsers: {type: Number, required: true, default: 0}

});


// review schema
const ReviewSchema = new mongoose.Schema({

    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    event: {type: mongoose.Schema.Types.ObjectId, ref: 'Event'},
    rating: {type: Number, required: true},
    reviewText: {type: String, required: true},
    timestamp: {type: Date, required: true}

});

// models
mongoose.model('User', UserSchema);
mongoose.model('Event', EventSchema);
mongoose.model('Review', ReviewSchema);

