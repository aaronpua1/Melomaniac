var express = require("express"),
    http = require("http"),
	app = express(),
    mongoose = require("mongoose"),
    redis = require("redis"),
	port = process.env.PORT || 3000,
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	bodyParser = require('body-parser'),
	client = redis.createClient(),
	cookieParser = require('cookie-parser'),	
	expressValidator = require('express-validator'),
	flash = require('connect-flash'),
	session = require('express-session'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,	
	User = require(__dirname + '/models/user'),
	clients = [],
	userList = [];
	
mongoose.connect('mongodb://melomaniac:webdev@ds050869.mlab.com:50869/melomaniac');
var db = mongoose.connection;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

app.use(flash());

app.get('/', ensureAuthenticated, function(req, res){
	res.sendFile(__dirname + '/client/index.html');	
});

function ensureAuthenticated(req, res, next) {
	if(req.isAuthenticated()){
		return next();
	} else {
		res.redirect('/login');
	}
}

server.listen(port, function() {
  console.log('Server is listening on port:3000');  
});

app.use(express.static(__dirname + "/client"));

app.get('/users', function(req,res){
    res.json(userList);
});

//Socket.io
io.on('connection', function(socket){ //SAMPLE FROM SOCKET.IO CHAT
	console.log('A new user connected');
	clients.push(socket);

	socket.on('disconnect', function(){
		clients.splice(clients.indexOf(socket), 1);
		console.log('A user disconnected: ' + socket.user );

        // remove username from the list
        for (var x = 0; x < userList.length; x++){
            if (userList[x] == socket.user){
                userList.splice(x,1);
            }
        }
        // remove username from other clients
        io.emit('removeUser', socket.user);
	});

    socket.on('newUser', function(newUsername) {
        console.log('A user connected: ' + newUsername);

        userList.push(newUsername);

        // each session has its own username as socket.user
        socket.user = newUsername;

        io.emit('newUser', newUsername);
    });
});

//Users.js
app.get('/register', function(req, res){
	res.sendFile(__dirname + '/client/register.html');
});

app.get('/login', function(req, res){
	res.sendFile(__dirname + '/client/login.html');
});

app.post('/register', function(req, res){
	var agent_name = req.body.agent_name;
	var agent_id = req.body.agent_id;
	var agent_email = req.body.agent_email;
	var password1 = req.body.password1;
	var password2 = req.body.password2;

	req.checkBody('agent_name', 'Name is required').notEmpty();
	req.checkBody('agent_id', 'ID is required').notEmpty();
	req.checkBody('agent_email', 'Email is not valid').isEmail();
	req.checkBody('password1', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password1);

	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors:errors
		});
	} else {
		var newUser = new User({
			agent_name: agent_name,
			agent_email: agent_email,
			agent_id: agent_id,
			password1: password1,
		});

		User.createUser(newUser, function(err, user){
			if(err) throw err;
			console.log(user);
		});

		req.flash('success_msg', 'You are registered and can now login');
		res.redirect('/login');
	}
});

passport.use(new LocalStrategy(
  function(username, password, done) {
   User.getUserByUserId(username, function(err, user){
		 if(err) throw err;
		 if(!user){
			 return done(null, false, {message: 'Unknown User'});
		 }
		 User.comparePassword(password, user.password1, function(err, isMatch){
			 if(err) throw err;
			 if(isMatch){
				 return done(null, user);
			 } else {
				 return done(null, false, {message:'Invalid password'})
			 }

		 });
	 });
  }));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

app.post('/login', passport.authenticate('local', {successRedirect:'/', failureRedirect:'/login',failureFlash: true}),
  function(req, res) {
    res.redirect('/');
});

app.get('/logout', function(req,res) {
	req.logout();
	req.flash('success_msg', 'You are logged out');
	res.redirect('/login');
});





