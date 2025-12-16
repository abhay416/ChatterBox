const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Get or create a conversation between current user and :userId
exports.getOrCreateConversation = async (req, res) => {
  try {
    const currentId = req.user._id.toString();
    const otherId = req.params.userId;
    if (currentId === otherId) return res.status(400).json({ message: 'Cannot create conversation with yourself' });

    // Try find a conversation that contains both participants
    let conv = await Conversation.findOne({ participants: { $all: [currentId, otherId] } })
      .populate('participants', 'username avatar')
      .populate('messages.from', 'username avatar');

    if (!conv) {
      conv = new Conversation({ participants: [currentId, otherId], messages: [] });
      await conv.save();
      conv = await Conversation.findById(conv._id).populate('participants', 'username avatar').populate('messages.from', 'username avatar');
    }
    res.json(conv);
  } catch (err) {
    console.error('GetOrCreateConversation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id).populate('participants', 'username avatar').populate('messages.from', 'username avatar');
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    // ensure current user is a participant
    const isParticipant = conv.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });
    res.json(conv);
  } catch (err) {
    console.error('GetConversation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    const isParticipant = conv.participants.some(p => p.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message cannot be empty' });
    conv.messages.push({ from: req.user._id, text: text.trim() });
    await conv.save();
    const populated = await Conversation.findById(conv._id).populate('participants', 'username avatar').populate('messages.from', 'username avatar');
    // emit update to room for this conversation (if socket server available)
    try {
      const io = global.io;
      if (io) {
        io.to(conv._id.toString()).emit('conversation_updated', populated);
      }
    } catch (e) {
      console.error('Emit conversation update error:', e);
    }
    res.json(populated);
  } catch (err) {
    console.error('SendMessage error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// List conversations for current user (returns minimal info)
exports.listConversations = async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username avatar')
      .populate('messages.from', 'username avatar');
    res.json(convs);
  } catch (err) {
    console.error('ListConversations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
