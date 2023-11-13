

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


// route -> USER VIEW
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



// route -> BOOK EVENT
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

// Route for handling specific events
router.get('/:username/:eventId', async (req, res) => {
    
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


router.post('/:username/book/:eventId', isAuthenticated, async (req, res) => {
    
    try {

        const userFound = await User.findOne({ username: req.params.username });
        const event = await Event.findById( req.params.eventId );

        if (!userFound || !event) {
            return res.status(404).send('User or event not found');
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












export default router;

