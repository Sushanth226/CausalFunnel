import express from 'express';
import Event from '../models/Event.js';

const router = express.Router();

router.post('/events', async (req, res) => {
  try {
    const { session_id, event_type, page_url, timestamp, x, y } = req.body;
    
    if (!session_id || !event_type || !page_url) {
      return res.status(400).json({ error: 'Missing required fields: session_id, event_type, page_url' });
    }

    const event = new Event({
      session_id,
      event_type,
      page_url,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      x: event_type === 'click' ? x : null,
      y: event_type === 'click' ? y : null
    });

    await event.save();
    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const { search, sortBy, sortOrder = 'desc', page = 1, limit = 10 } = req.query;

    const pipeline = [];

    // Filter by session_id search if provided
    if (search) {
      pipeline.push({
        $match: {
          session_id: { $regex: search, $options: 'i' }
        }
      });
    }

    // Group to calculate aggregates per session_id
    pipeline.push({
      $group: {
        _id: '$session_id',
        session_id: { $first: '$session_id' },
        total_events: { $sum: 1 },
        first_seen: { $min: '$timestamp' },
        last_seen: { $max: '$timestamp' }
      }
    });

    // Apply sorting
    const validSortFields = ['session_id', 'total_events', 'first_seen', 'last_seen'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'last_seen';
    const direction = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({
      $sort: { [sortField]: direction }
    });

    // Apply pagination using $facet
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 10;
    const skip = (parsedPage - 1) * parsedLimit;

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: parsedLimit }]
      }
    });

    const result = await Event.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const sessions = result[0]?.data || [];

    res.json({
      sessions,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const events = await Event.find({ session_id: sessionId }).sort({ timestamp: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/heatmap', async (req, res) => {
  try {
    const { pageUrl } = req.query;
    if (!pageUrl) {
      return res.status(400).json({ error: 'pageUrl query parameter is required' });
    }
    const clicks = await Event.find(
      { page_url: pageUrl, event_type: 'click' },
      'x y timestamp'
    ).sort({ timestamp: 1 });
    res.json(clicks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pages', async (req, res) => {
  try {
    const pages = await Event.distinct('page_url');
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    
    const sessionCountResult = await Event.aggregate([
      { $group: { _id: '$session_id' } },
      { $count: 'count' }
    ]);
    const totalSessions = sessionCountResult[0]?.count || 0;

    const topPageResult = await Event.aggregate([
      { $group: { _id: '$page_url', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const topPage = topPageResult[0]?._id || 'N/A';

    res.json({
      totalEvents,
      totalSessions,
      topPage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
