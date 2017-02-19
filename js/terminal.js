//Override JQuery Terminal default strings
$.terminal.defaults.strings.commandNotFound = "Command not recognized";
$.terminal.defaults.strings.wrongArity = "Command '%s' expects %s argument(s)";

var greeting = "Welcome! You are logged in as a guest.\nType [[b;#993333;]help] for a list of available commands.";

var aws = "https://xlxjlcwmx6.execute-api.us-east-1.amazonaws.com/prod/interpretCommand";
var gcp = "https://us-central1-ryanmac-159023.cloudfunctions.net/interpretCommand";

//Default to AWS
var cloud = "aws";
var remoteInterpreter = aws;

function setCloud(value) {
	cloud = value;
	if (typeof(Storage) !== "undefined") {
		//store for future sessions if supported
	    localStorage.setItem("cloud", value);
	}
	if (value == 'gcp')
		remoteInterpreter = gcp;
	else
		remoteInterpreter = aws;
}

function getCloud() {
	if (typeof(Storage) !== "undefined") {
		//retrieve for local storage first if supported
	    cloud = localStorage.getItem("cloud");
	}
	if (cloud == 'gcp')
		remoteInterpreter = gcp;
	else
		remoteInterpreter = aws;
}

var localInterpreter = {
	cloud: function(arg1) {
		if (arg1 == 'aws') setCloud('aws');
		else if (arg1 == 'gcp') setCloud('gcp');
		if (cloud == 'gcp')
			this.echo('You are currently connected to Google Cloud Platform ' +
				      '\nType [[b;#993333;]cloud aws] to switch to Amazon Web Services');
		else
			this.echo('You are currently connected to Amazon Web Services ' +
				      '\nType [[b;#993333;]cloud gcp] to switch to Google Cloud Platform');
	},
	echo: function(arg1) {
		this.echo(arg1);
	},
	hello: function() {
		this.echo(greeting,{keepWords:true});
	},
	help: function() {
		this.echo("Available commands are:" +
					"\n[[b;#993333;]clear]     clear the terminal" +
					"\n[[b;#993333;]cloud]     display/switch cloud services provider" +
					"\n[[b;#993333;]email]     send an email to the site owner" +
					"\n[[b;#993333;]hello]     print the login greeting message" +
					"\n[[b;#993333;]help]      print this message" +
					"\n[[b;#993333;]su]        elevate privileges"
				,{keepWords:true});
	},
	email: function() {
		var email_name, email_address, email_message;
		this.echo("Please enter your name, email address, and message where prompted." +
			      "\nEnter [[b;#993333;]exit] at any time to cancel.",{keepWords:true});
		var history = this.history();
        history.disable();
        this.push(function(input) {
        	var email_name = input;
        	if (/^\s*$/.test(email_name)) //simple check for all whitespaces or empty string
        		this.echo('');
        	else
	        	this.push(function(input) {
	        		var email_address = input;
	        		if (/^\s*$/.test(email_address)) //simple check for all whitespaces or empty string
        				this.echo('');
        			else if (!/.+@.+/.test(email_address)) //simple check for @
	        			this.error("Sorry, that doesn't appear to be a valid e-mail address.");
	        		else
			            this.push(function(input, term) {
			            	var email_message = input;
			            	if (/^\s*$/.test(email_message)) //simple check for all whitespaces or empty string
        						this.echo('');
        					else {
				      			this.pause();
				      			$.jrpc(remoteInterpreter, 'email', [email_name, email_address, email_message],
				      				function(json) { //success callback
				      					term.resume();
				      					term.echo(json.result,{keepWords:true});
				      					term.pop();
					            		history.enable();	
				      				},
				      				function(xhr, status, error) { //error callback
				      					term.resume();
				      					term.error("Sorry, there was an error sending your message. Please try again later.");
				      					term.pop();
					            		history.enable();
				      				}
								);
							}
			   			}, { prompt: "Your message: ", onExit: function(term) {term.pop();}});
	        	}, { prompt: "Your email address: ", onExit: function(term) {term.pop();}});
        }, { prompt: "Your name: "});
	},
	su: function() {
		var history = this.history();
        history.disable();
        this.push(function(input) {
        	this.pop();
			history.enable();
			//authentication is currently disabled so all attempts will fail
			this.error("Sorry, authentication failed");
        }, { prompt: "Password: ", onStart: function(term){term.set_mask("*")}}); 
	}
};

jQuery(document).ready(function($) {
	getCloud();
	$('#console').terminal(
		localInterpreter, 	
		{
			greetings: "", //greetings are shown using echo in onInit so keepWords can be used
			ignoreSystemDescribe: true,
			prompt: "$ ",
			checkArity: false,
			execHash: true,
			onAjaxError: function(response, xhr, status, error) {
				this.error(response.responseText);
			},
			onCommandNotFound: function(cmd, term) {
				term.error("Sorry, that command was not recognized.");
				term.echo("Enter [[b;#993333;]help] for a list of available commands.",{keepWords:true});
			},
			onInit: function(term) {
				term.echo(greeting,{keepWords:true});			
			},
			onAfterCommand: function(cmd) {
				window.scrollTo(0,document.body.scrollHeight);
			}
		}
	);

	$('#emailLink').click(function() {
		$('#console').terminal().exec("email");
		return false;
	});
});

