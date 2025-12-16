const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getOrCreateConversation, getConversation, sendMessage, listConversations } = require('../controllers/chatController');

router.get('/', auth, listConversations);
router.get('/with/:userId', auth, getOrCreateConversation);
router.get('/:id', auth, getConversation);
router.post('/:id/message', auth, sendMessage);

module.exports = router;
