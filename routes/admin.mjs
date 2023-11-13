
import '../db.mjs';
import express from 'express';
const router = express.Router();

import mongoose from 'mongoose';
const User = mongoose.model("User");
const Event = mongoose.model("Event");


// route -> ADMIN VIEW
router.get('/events', async (req, res) => {

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
router.get('/newEvent', async (req, res) => {

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

        // redirect to the homepage
        res.redirect('/admin/events');
    } 
    catch (err) {
        res.status(500).send("Error: " + err);
    }
});

export default router;

