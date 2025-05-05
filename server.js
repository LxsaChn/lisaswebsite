require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
app.use(express.json());

// Handle root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS   
    }
  });

  const mailOptions = {
    from: email,
    to: process.env.EMAIL_USER,
    subject: `New message from ${name}`,
    text: `From: ${email}\n\nMessage: ${message}` // Include visitor's email
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(err);
      res.status(500).send('Something went wrong.');
    } else {
      res.send('Message sent!');
    }
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));

// Code for cat display

const axios = require('axios');

let accessToken = '';
let tokenExpiry = 0;

// Get access token
async function fetchAccessToken() {
  if (Date.now() < tokenExpiry) return accessToken;

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.PETFINDER_API_KEY);
  params.append('client_secret', process.env.PETFINDER_API_SECRET);

  const res = await axios.post(
    'https://api.petfinder.com/v2/oauth2/token',
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  accessToken = res.data.access_token;
  tokenExpiry = Date.now() + res.data.expires_in * 1000;
  return accessToken;
}


// Get random cat
app.get('/cat', async (req, res) => {
  try {
    const token = await fetchAccessToken();
    const { data } = await axios.get('https://api.petfinder.com/v2/animals', {
      headers: { Authorization: `Bearer ${token}` },
      params: { type: 'cat', location: 'Vancouver, BC', limit: 50 }
    });

    const cats = data.animals.filter(cat => cat.photos.length > 0);
    const randomCat = cats[Math.floor(Math.random() * cats.length)];

    res.json({
      name: randomCat.name,
      photo: randomCat.photos[0].medium,
      url: randomCat.url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to fetch cat');
  }
});