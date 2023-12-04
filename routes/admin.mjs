
import '../db.mjs';
import express from 'express';
const router = express.Router();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const User = mongoose.model("User");
const Event = mongoose.model("Event");
const Review = mongoose.model("Review");


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
                filteredEvents.price = { $gte: req.query.price };
            }

            // Finding relevant events from the database -- based on query values
            allEvents = await Event.find(filteredEvents)
                        .populate('addedBy');

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

        if (req.body.participants) {

            // remove leading and trailing spaces
            const trimmedParticipantsInput = req.body.participants.trim();

            if (trimmedParticipantsInput) {
                
                // add participants to the event
                const participants = trimmedParticipantsInput.split(',');
                const filteredParticipants = participants.map(participant => participant.trim());

                // remove empty strings from the array
                const validParticipants = filteredParticipants.filter(participant => participant !== '');
                const lastParticipant = validParticipants[validParticipants.length - 1];
                
                if (!lastParticipant) {
                    validParticipants.pop();
                }

                // for each participant, check if they exist in the database
                // if yes, add the event to their 'events' array
                // if no, create a new user and add the event to their 'events' array
                for (let i = 0; i < validParticipants.length; i++) {

                    const participant = validParticipants[i];

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
            }
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


// route -> ADMIN: View participants
router.get('/events/participants/:eventID', isAuthenticated, async (req, res) => {

    // Display all reviews for this event
    const eventID = req.params.eventID;

    try {
        const event = await Event.findById(eventID).populate('participants', 'name username');

        if (!event) {
            res.status(404).send('Event not found');
            return;
        }

        res.render('participants', { event: event });

    } catch (err) {
        console.log("Error in displaying participants: ", err);
        res.status(500).send("Internal Server Error");
    }

});


// route -> ADMIN: Edit Event Get
// Display the edit event form
router.get('/events/edit/:eventID', isAuthenticated, async (req, res) => {

    const eventID = req.params.eventID;

    try {
        // Find the event by ID
        const event = await Event.findById(eventID);

        if (!event) {
            res.status(404).send('Event not found');
            return;
        }

        // Format the date
        const formattedDate = event.date.toISOString().split('T')[0];

        // Render the editEvent.hbs with the event details
        res.render('editEvent', { event: event, formattedDate: formattedDate });

    } catch (err) {
        console.log("Error in displaying edit event form: ", err);
        res.status(500).send("Internal Server Error");
    }


});


// route -> ADMIN: Edit Event POST
router.post('/events/edit/:eventID', isAuthenticated, async (req, res) => {
    const eventID = req.params.eventID;

    try {
        // Find the event by ID
        const event = await Event.findById(eventID);

        if (!event) {
            res.status(404).send('Event not found');
            return;
        }

        // Update event fields based on the form data
        event.title = req.body.title;
        event.date = req.body.date;
        event.venue = req.body.venue;
        event.price = req.body.price;
        event.description = req.body.description;

        // Save the updated event
        await event.save();

        // Redirect to the events page or any other appropriate page
        res.redirect('/admin/events');

    } catch (err) {
        console.log("Error in updating event: ", err);
        res.status(500).send("Internal Server Error");
    }
});




// route -> ADMIN: Edit Event
router.get('/events/delete/:eventID', isAuthenticated, async (req, res) => {

    const eventID = req.params.eventID;

    try {
        // Find the event by ID
        const event = await Event.findById(eventID);

        if (!event) {
            res.status(404).send('Event not found');
            return;
        }

        // Find users who booked this event and remove the event from their 'events' array
        const users = await User.find({ events: eventID });
        users.forEach(async (user) => {
            user.events.pull(eventID);
            await user.save();
        });

        // Delete associated reviews
        await Review.deleteMany({ event: eventID });

        // remove the event from the 'addedEvents' array of the admin
        await User.updateOne({ addedEvents: eventID }, { $pull: { addedEvents: eventID } });

        // Delete the event
        await Event.findByIdAndDelete(eventID);

        // Redirect to the events page or any other appropriate page
        res.redirect('/admin/events');

    } catch (err) {
        console.log("Error in deleting event: ", err);
        res.status(500).send("Internal Server Error");
    }

});





export default router;

