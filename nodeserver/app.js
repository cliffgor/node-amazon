var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var massive = require('massive');
var cors = require('cors');
var session = require('express-session');

var google = require('googleapis');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;

var config = require('./config.json');

var connection = config.postgresPath;

var app = module.exports = express();

var massiveInstance = massive.connectSync({
    connectionString: connection,
    scripts: "./nodeserver/db"   //location of db folder for massive
});

app.set('db', massiveInstance);

var db = app.get('db');

var shopCtrl = require('./controllers/shop.js');

app.use(session({
    secret: config.sessionSecret,
    saveUninitialized: false,
    resave: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static(__dirname + '/../dist')); //location of index.html for node to serve

passport.use(new GoogleStrategy({
    clientID: config.googClientId,
    clientSecret: config.googSecret,
    callbackURL: config.googCallback
},
    function (accessToken, refreshToken, profile, cb) {
        db.customers.findOne({google_id: profile.id}, function (err, foundUser){
            if(foundUser === undefined) {
                console.log("DID NOT FIND USER. Creating...", err);
                db.customers.insert({google_id: profile.id, given_name: profile.name.givenName, email: profile.emails[0].value, fullname: profile.displayName}, function (err, newUser){
                    return cb(null, newUser);
                })
            }
            else {
                // console.log("FOUND USER: ", foundUser);
                return cb(null, foundUser);
            }
        });
    }
));

app.get('/auth',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    function (req, res) {
        // Successful authentication, redirect to last user page.
        res.redirect(`${req.session.location}`);
    });

app.get('/login/:param', (req, res) => {
    req.session.location = req.query.location; //store user's last page
    return res.redirect('/auth/');
});

app.get('/user/status/', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(200).json({
            status: false
        });
    }
    res.status(200).json({
        userName: req.user.given_name,
        status: true
    });
})

app.get('/api/product/:productId', shopCtrl.getProductById, shopCtrl.getSimilarById);
app.get('/api/shop/:page', shopCtrl.getAllProducts);
app.get('/api/user/cart', shopCtrl.getFromCart);
app.get('/api/user/checkout', shopCtrl.getCheckoutInfo);
app.get('/api/user/orders', shopCtrl.getUserOrders);
app.get('/api/user/order/:id', shopCtrl.getOrderById);
app.delete('/api/user/cart/remove/:id', shopCtrl.removeFromCart);
app.post('/api/user/checkout/confirm', shopCtrl.checkoutConfirm);
app.post('/api/cart/add', shopCtrl.addToCart);

app.get('/logout', (req, res) => {
  req.session.destroy((e)=>{
    req.logout();
    res.redirect('/');
  })
});

// Wildcard for all possible routes
app.get('*', function(request, response) {
    response.sendFile(path.resolve('./dist/index.html'))
});

passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});

if (app.get('env') === 'development') {
    app.listen(3000, () => {
        console.log('App listening on port 3000!');
    });
}
else {
    app.listen(8080, () => {
        console.log('App listening on port 8080!');
    });
}