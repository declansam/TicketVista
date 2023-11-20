
import '../db.mjs';
import express from 'express';
const router = express.Router();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const User = mongoose.model("User");
const Event = mongoose.model("Event");


// middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

// route -> ADMIN VIEW
router.get('/events', isAuthenticated, async (req, res) => {

    const username = req.session.username;
    const pattern = new RegExp(`^${username}$`, 'i');
    const title = "Admin View";

    try {
        
        const userFound = await User.findOne({username: pattern});

        if (userFound && userFound.admin) {
            
            // Get all events from the database
            let allEvents = await Event.find({});
            const filteredEvents = {};

            // If query parameter(s) is(are) present, add it(them) to the filteredEvents object
            if (req.query.title) {
                filteredEvents.title = { $regex: new RegExp(req.query.title, 'i') };
            }
            
            if (req.query.price) {
                filteredEvents.price = req.query.price;
            }

            // Finding relevant events from the database -- based on query values
            allEvents = await Event.find(filteredEvents);

            // render admin.hbs with filtered events (if any)
            res.render('admin', {title, events: allEvents});
        }

        // if user not found or is not admin
        else {
            const error = "403 Forbidden";
            res.render('admin', {error});
        }

    }
    catch(err) {
        console.log("Error in Admin View: ", err);
    }

});





// route -> ADMIN: NEW EVENT
router.get('/newEvent', isAuthenticated, async (req, res) => {

    const username = req.session.username;
    const pattern = new RegExp(`^${username}$`, 'i');

    try {
        
        const userFound = await User.findOne({username: pattern});

        // if user exists and is admin
        if (userFound && userFound.admin) {
            res.render('newEvent', {});
        }

        // if user not found or is not admin
        else {
            const error = "403 Forbidden";
            res.render('newEvent', {error});
        }

    }
    catch(err) {
        console.log("Error in Admin Add Event: ", err);
    }

});


router.post('/newEvent', async (req, res) => {
    
    try {
        
        // Get the username of the admin
        const addedByUser = req.session.username;
        const userFound = await User.findOne({ username: addedByUser });

        // If admin not found
        if (!userFound) {
            res.status(404).send("Admin not found");
            return;
        }

        // fields retreived from the form
        const fields = ['title', 'date', 'venue', 'price', 'description'];

        // use reduce to create an object with the fields and their values
        const eventData = fields.reduce((data, field) => {

            if (!req.body[field]) {
                res.status(400).send(`Missing ${field} in request body`);
                throw new Error(`Missing ${field} in request body`);
            }

            data[field] = req.body[field];
            return data;

        }, {} );

        // Create a new event object
        const newEvent = new Event({
            ...eventData,
            numUsers: 0,
            addedBy: userFound._id,
        });

        // Save the event to the database
        const savedEvent = await newEvent.save();
        console.log(savedEvent);

        // Update the 'addedEvents' array of the user
        userFound.addedEvents.push(savedEvent._id);
        await userFound.save();


        // add participants to the event
        const participants = req.body.participants.split(',');
        const filteredParticipants = participants.map(participant => participant.trim());

        // for each participant, check if they exist in the database
        // if yes, add the event to their 'events' array
        // if no, create a new user and add the event to their 'events' array
        for (let i = 0; i < filteredParticipants.length; i++) {

            const participant = filteredParticipants[i];

            // check if the participant exists in the database
            const participantFound = await User.findOne({ username: participant });

            // if participant found, add the event to their 'events' array
            if (participantFound) {
                
                // add the event to the participant's 'events' array
                participantFound.events.push(savedEvent._id);
                await participantFound.save();

                // add the participant to the event's 'participants' array
                savedEvent.participants.push(participantFound._id);
                await savedEvent.save();

            }

            // if participant not found, create a new user and add the event to their 'events' array
            else {
                const newParticipant = new User({
                    name: participant,
                    username: participant,
                    hash: await bcrypt.hash(participant, 10),
                    admin: false,
                    events: [savedEvent._id],
                    addedEvents: []
                });

                // save the new participant to the database
                const savedParticipant = await newParticipant.save();
                console.log(savedParticipant);

                // add the participant to the event's 'participants' array
                savedEvent.participants.push(savedParticipant._id);
                await savedEvent.save();
            }

            // update the number of users for this event
            savedEvent.numUsers = savedEvent.participants.length;
            await savedEvent.save();
        }
        


        // redirect to the homepage
        res.redirect('/admin/events');
    } 
    catch (err) {
        res.status(500).send("Error: " + err);
    }
});




// route -> ADMIN: View Reviews
router.get('/events/reviews/:eventID', isAuthenticated, async (req, res) => {

    // Display all reviews for this event
    const eventID = req.params.eventID;

    try {
        
        // find the event with the given ID
        // populate the 'allReviews' array with the reviews for this event
        // populate the 'user' field of each review with the user's name
        const event = await Event.findById(eventID).populate({
            path: 'allReviews',
            populate: { path: 'user', select: 'name' }
        });

        if (!event) {
            res.status(404).send('Event not found');
            return;
        }

        // display all reviews for this event on the same page
        res.render('reviews', { event: event, reviews: event.allReviews });

    }
    catch(err) {
        console.log("Error in Admin View Reviews: ", err);
    }
    

});



export default router;

