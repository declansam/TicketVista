

import '../db.mjs';
import express from 'express';
const router = express.Router();

import mongoose from 'mongoose';
const User = mongoose.model("User");
const Event = mongoose.model("Event");


// middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};


// route GET --> USER VIEW
router.get('/:username/events', isAuthenticated, async (req, res) => {
    
    try {

        const userFound = await User.findOne( { username: req.params.username } );
        
        if (!userFound) {
            return res.status(404).send('User not found');
        }

        // Fetch events specific to the user
        const userEvents = await Event.find( { participants: userFound._id } );
        
        res.render('userEvents', { userEvents: userEvents, userFound: userFound });
        
    } 
    catch (error) {
        console.error('Error fetching user events:', error);
        res.status(500).send('Internal Server Error');
    }

});



// Route GET --> BOOK EVENT
// Page to book an event
router.get('/:username/book', isAuthenticated, async (req, res) => {
    
    try {
        
        const userFound = await User.findOne({ username: req.params.username });
        const allEvents = await Event.find({});

        if (!userFound) {
            return res.status(404).send('User not found');
        }

        res.render('bookEvent', { userFound: userFound, allEvents: allEvents });
    } 
    catch (error) {

        console.error('Error fetching user:', error);
        res.status(500).send('Internal Server Error');
        
    }

});


// Route GET for handling specific events
// Book this specific event
router.get('/:username/:eventId', isAuthenticated, async (req, res) => {
    
    try {
        const userFound = await User.findOne({ username: req.params.username });
        const event = await Event.findById(req.params.eventId);

        if (!userFound || !event) {
            return res.status(404).send('User or event not found');
        }

        // Render a page to handle the specific event
        res.render('specificEventPage', { userFound, event });

    } 
    catch (error) {

        console.error('Error fetching user or event:', error);
        res.status(500).send('Internal Server Error');

    }
});


// Route POST --> BOOK EVENT
router.post('/:username/book/:eventId', isAuthenticated, async (req, res) => {
    
    try {

        const userFound = await User.findOne({ username: req.params.username });
        const event = await Event.findById( req.params.eventId );
        
       

        if (!userFound || !event) {
            return res.status(404).send('User or event not found');
        }

        // Check if the user has already booked the event
        if (userFound.events.some(bookedEvent => bookedEvent.equals(event._id))) {
             
            // Fetch events specific to the user
            const userEvents = await Event.find( { participants: userFound._id } );
            return res.status(400).render('userEvents', { userFound: userFound, userEvents: userEvents, error: "You have already booked the said event!"});

        }

        // Add the event to the user's event list
        userFound.events.push(event._id);
        await userFound.save();

        // Add the user to the event's participant list
        event.participants.push(userFound._id);
        await event.save();

        event.numUsers = event.participants.length;
        await event.save();

        res.redirect(`/u/${userFound.username}/events`);

    } 
    catch (error) {

        console.error('Error booking event:', error);
        res.status(500).send('Internal Server Error');

    }
});


// Route GET --> CANCEL EVENT
// Cancel this specific event
router.get('/:username/unbook/:eventId', isAuthenticated, async (req, res) => {
    
    try {
        const userFound = await User.findOne({ username: req.params.username });
        const event = await Event.findById(req.params.eventId);

        if (!userFound || !event) {
            return res.status(404).send('User or event not found');
        }

        // Render a page to handle the specific event
        res.render('unbookEvent', { userFound, event });

    } 
    catch (error) {

        console.error('Error fetching user or event:', error);
        res.status(500).send('Internal Server Error');

    }
});


// Route POST --> unbook event
router.post('/:username/unbook/:eventId', isAuthenticated, async (req, res) => {

    try {
        const userFound = await User.findOne({ username: req.params.username });
        const event = await Event.findById(req.params.eventId);

        if (!userFound || !event) {
            return res.status(404).send('User or event not found');
        }

        // Remove the event from the user's event list
        userFound.events.pull(event._id);
        await userFound.save();

        // Remove the user from the event's participant list
        event.participants.pull(userFound._id);
        await event.save();

        event.numUsers = event.participants.length;
        await event.save();

        res.redirect(`/u/${userFound.username}/events`);
    
    }
    catch (e) {
        console.error('Error unbooking event:', e);
        res.status(500).send('Internal Server Error');
    }

});










export default router;

