// Create web server with express
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');

const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
  // Create random id
  const commentId = randomBytes(4).toString('hex');
  // Get the post id from the url
  const { id } = req.params;
  // Get the comment from the request body
  const { content } = req.body;

  // Get the comments from the post id
  const comments = commentsByPostId[id] || [];

  // Add the new comment to the comments array
  comments.push({ id: commentId, content, status: 'pending' });
  // Add the comments array to the post id
  commentsByPostId[id] = comments;

  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: id, status: 'pending' },
  });

  // Send the new comments array
  res.status(201).send(comments);
});

// Receive event from event bus
app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);

  // Get the event type
  const { type, data } = req.body;

  // If the event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get the comment from the event data
    const { id, postId, status, content } = data;

    // Get the comments from the post id
    const comments = commentsByPostId[postId];

    // Find the comment by id
    const comment = comments.find((comment) => comment.id === id);

    // Update the comment status
    comment.status = status;

    // Send event to event bus
    await axios.post('http://event-bus-srv:400