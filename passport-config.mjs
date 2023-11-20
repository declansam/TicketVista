
import "./db.mjs";

import passport from 'passport';
import LocalStrategy from 'passport-local';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import sanitize from "mongo-sanitize";

const User = mongoose.model("User");


// callback functions and passport configuration
const inputData = {
    usernameField: 'username',
    passwordField: 'password'
};


const verifyCallback = async (username, password, done) => {
    
    try {
        
        const sanitizedUsername = sanitize(username);
        const pattern = new RegExp(`^${sanitizedUsername}$`, 'i');
        const user = await User.findOne({username: pattern});

        // check if user exists
        if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
        }

        // compare password
        try {

            const sanitizedPassword = sanitize(password);
            const isValid = await bcrypt.compare(sanitizedPassword, user.hash);

            if (isValid === false) {
                return done(null, false, { message: 'Incorrect password.' });
            }

        }
        catch (e) {
            return done(null, false, { message: 'Error Hashing Password.' });
        }

        // if everything is fine
        return done(null, user);

    } 
    catch (err) {

        return done(err);

    }

};

// Passport configuration -> LocalStrategy to authenticate users using username and password
const strategy = new LocalStrategy(inputData, verifyCallback);
passport.use(strategy);

const registerStrategy = new LocalStrategy(
    {
        ...inputData,

        // gives access to the request object
        passReqToCallback: true
    },

    async (req, username, password, done) => {

        const pattern = new RegExp(`^${username}$`, 'i');
        const userFound = await User.findOne({ username: pattern });

        // reCAPTCHA verification - make it mandatory to register
        const recaptchaResponse = req.body['g-recaptcha-response'];
        const secretkey = process.env.RECAPTCHASECRETKEYREG;
        const recaptchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretkey}&response=${recaptchaResponse}`;

        try {
            // Verify reCAPTCHA
            const recaptchaVerificationResult = await fetch(recaptchaVerificationUrl, {
                method: 'POST',
            });

            // Parse verification result
            const recaptchaData = await recaptchaVerificationResult.json();

            // If reCAPTCHA verification failed, return an error
            // render the register page with (1) API KEY -> to rensure reCAPTCHA is displayed
            // (2) formData -> to ensure that the user doesn't have to re-enter the data
            if (!recaptchaData.success) {
                
                console.error('Error verifying reCAPTCHA - no success:');
                return done(null, false, {
                    message: 'Error verifying reCAPTCHA!',
                    renderData: { error: 'Error verifying reCAPTCHA!', formData: req.body },
                });
            }

            // Continue with user registration
            if (userFound) {

                console.error('User already exists.');
                return done(null, false, { 
                    message: 'User already exists.', 
                    renderData: { error: 'User already exists.', formData: req.body },
                });
            }

            const newUser = new User({
                name: (req.body.name),
                username: req.body.username,
                hash: await bcrypt.hash(req.body.password, 10),
                admin: req.body.admin
            });

            const savedUser = await newUser.save();
            return done(null, savedUser);

        } catch (error) {
            
            console.error('Registration failed. Name & Credentials need to be 4-characters long.', error);
            return done(null, false, { 
                message: 'Registration failed. Name & Credentials need to be 4-characters long.',
                renderData: { error: 'Registration failed. Name & Credentials need to be 4-characters long.', formData: req.body },
            });
        }
    }
);

passport.use('register', registerStrategy);


// Passport configuration -> serializeUser used to store user id in session
passport.serializeUser((user, done) => {

    done(null, user.id);

});

// Passport configuration -> deserializeUser used to retrieve user from session
passport.deserializeUser(async (id, done) => {
  
    try {
        const user = await User.findById(id);
        done(null, user);
    } 
    catch (err) {
        done(err);
    }

});

export default passport;
