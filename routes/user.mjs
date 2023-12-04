

import '../db.mjs';
import express from 'express';
const router = express.Router();

import mongoose from 'mongoose';
const User = mongoose.model("User");
const Event = mongoose.model("Event");
const Review = mongoose.model("Review");


// middleware to check if user is authenticated and provide user specific data
const isAuthenticated = (req, res, next) => {
    
    if (req.isAuthenticated()) {

        // Check if the authenticated user matches the requested user
        if (req.params.username && req.params.username !== req.user.username) {
            return res.status(403).render('forbidden', { message: 'Forbidden' });
        }

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
        const userEvents = await Event.find( { participants: userFound._id } )
        
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
        let allEvents = await Event.find({})
                        .populate('addedBy');

        if (!userFound) {
            return res.status(404).send('User not found');
        }

        // Filter out events based on the query
        allEvents = allEvents.filter(event => {
            
            // Check if the description matches the query
            const descriptionMatch = !req.query.description || event.description.match(new RegExp(req.query.description, 'i'));

            // Check if the title matches the query (case-insensitive)
            return descriptionMatch;
        });

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


// Route GET --> Feedback Form
// Feedback form for the event: (1) That user has booked and (2) That is in the past as of today
router.get('/:username/feedback/:eventId', isAuthenticated, async (req, res) => {
    
    try {
        const userFound = await User.findOne({ username: req.params.username });
        const event = await Event.findById(req.params.eventId);

        if (!userFound || !event) {
            return res.status(404).send('User or event not found');
        }

        // Render a page to submit feedback for the specific event
        res.render('submitFeedback', { userFound, event });

    } 
    catch (error) {

        console.error('Error fetching user or event:', error);
        res.status(500).send('Internal Server Error');

    }
});


// Route POST --> Feedback Form
router.post('/:username/feedback/:eventId', isAuthenticated, async (req, res) => {

    try {
        const userFound = await User.findOne({ username: req.params.username });
        const event = await Event.findById(req.params.eventId);

        if (!userFound || !event) {
            return res.status(404).send('User or event not found');
        }

        // Add the user's feedback to the review schema
        const userReview = new Review({
            user: userFound._id,
            event: event._id,
            rating: req.body.rating,
            reviewText: req.body.reviewText,
            timestamp: new Date()
        });

        await userReview.save();

        // Add the user's feedback to the event's review list
        event.allReviews.push(userReview._id);
        await event.save();

        // Add the event to the user's review list
        userFound.review.push(userReview._id);
        await userFound.save();

        res.redirect(`/u/${userFound.username}/events`);

    } 
    catch (error) {

        console.error('Error booking event:', error);
        res.status(500).send('Internal Server Error');

    }
});












export default router;

