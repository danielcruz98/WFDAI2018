const port = 80;
const ejs = require('ejs');
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();
const validator = require('express-validator');
const bcrypt = require('bcrypt-nodejs');
//new
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const usersModel = require('./models/user.model');
//nexmo SMS
const Nexmo = require('nexmo');
const socketio = require('socket.io');

const server = app.listen(port, () => console.log(`Server started on port ${port}`));

const nexmo = new Nexmo({
	apiKey:'57bc054e',
	apiSecret:'dmluGy8VJAra7hie'
}, {debug: true});


//This function will allow us to retrict the access to the routes
global.secure = function(type) {
	return function (request, response, next) {
		if (request.isAuthenticated()) {
			if (type) {
				if (type === request.user.type) {
					return next();
				}else{
					response.redirect('/');
				}
			}else{
				return next();
			}			
		}
		response.redirect('/');
	}
};
//end of new

app.use(validator());
app.use(bodyParser.json(), bodyParser.urlencoded({ extended: true }));

//new
app.use(cookieParser());
app.use(session({
	secret: 'someRandomSecretKey',
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(username, callback) {
	callback(null, username);
});

passport.deserializeUser(function(username, callback) {
	usersModel.read(username, function(data) {
		callback(null, data);
	})
});
//end of new

global.connection = mysql.createConnection({
	host     : '34.243.203.139',
	user     : 'wfdai',
	password : 'ieY4eemaJeifoh4z',
	database : 'mydb',
}).on('enqueue', function (sequence) {
	if ('Query' === sequence.constructor.name) {
		console.log(sequence.sql);
	}
});

//app.listen(port, function(){
	//console.log('Server started at: ' + port);
//});

//Midleware that sets the isAuthenticated variable in all views
app.use(function(request, response, next){
	response.locals.user = request.user;
	response.locals.isAuthenticated = request.isAuthenticated();
	next();
});

app.post('/', (request, response) => {
	//req.send(req.body);
	//console.log(req.body);
	const numero = request.body.numero;
	const texto = request.body.texto;

	nexmo.message.sendSMS(
		'351912493365', numero, texto, {type: 'unicode'},
		(err, responseData) => {
			if(err){
				console.log(err);
			} else{
				console.dir(responseData);
				const data = {
					id: responseData.messages[0]['message-id'],
					number: responseData.messages[0]['to']
				}
				io.emit('smsStatus',data);
			}
		}
	);
});

const io = socketio(server);
io.on('connection', (socket) => {
  console.log('Connected');
  io.on('disconnect', () => {
    console.log('Disconnected');
  })
})


// Public folder setup
app.use(express.static(__dirname + '/public'));

// Body parser middleware;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

app.set('view engine', 'ejs');
app.set('views','views');
app.engine('views', ejs.renderFile);

app.get('/', (req, res) =>{
	res.render('index');
});

//app.use('/', require('./controllers/index.route'));
app.use('/public', express.static('public'));

//new
app.use('/login', require('./controllers/login.route'));
app.use('/logout', require('./controllers/logout.route'));
app.use('/register', require('./controllers/register.route'));
// new NXF
app.use('/users', require('./controllers/user.route'));
app.use('/admin', require('./controllers/admin.route'));
