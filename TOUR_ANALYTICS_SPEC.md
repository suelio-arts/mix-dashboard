# Tour Analytics Dashboard Specification

## Overview
Dashboard section for visualizing tour completion rates, user drop-off points, and location visit heatmaps.

## Data Source
**Firestore Collection**: `tour_visits`
**Schema**:
```
tour_visits/{visitId}
  - userId: string
  - tourId: string (layer ID)
  - locationId: string (element ID)
  - visitedAt: timestamp
  - verificationMethod: "proximity" | "photo"
```

## Dashboard Features

### 1. Tour Completion Rates
**Visualization**: Bar chart or progress bars

**Metrics**:
- Total users who started each tour (unique userIds per tourId)
- Average completion percentage per tour
- Distribution of users by number of locations visited

**Query**:
```javascript
// Get all visits grouped by tourId
const visitsSnapshot = await db.collection('tour_visits')
  .orderBy('tourId')
  .get();

// Group by tourId and userId to calculate completion rates
const tourStats = {};
visitsSnapshot.forEach(doc => {
  const {tourId, userId, locationId} = doc.data();
  if (!tourStats[tourId]) {
    tourStats[tourId] = {
      users: new Set(),
      visitedLocations: new Set()
    };
  }
  tourStats[tourId].users.add(userId);
  tourStats[tourId].visitedLocations.add(locationId);
});

// Calculate completion rate (requires knowing total locations per tour)
// Fetch tour metadata from layers collection
```

### 2. Location Visit Heatmap
**Visualization**: Map overlay with color intensity by visit count

**Metrics**:
- Visit count per location across all tours
- Most popular tour locations
- Geographic distribution of visits

**Query**:
```javascript
// Get all visits with location data
const visitsSnapshot = await db.collection('tour_visits')
  .orderBy('visitedAt', 'desc')
  .limit(1000)
  .get();

// Join with elements collection to get lat/lng
const locationCounts = {};
for (const doc of visitsSnapshot.docs) {
  const {locationId} = doc.data();
  const elementDoc = await db.collection('element').doc(locationId).get();
  if (elementDoc.exists) {
    const {latitude, longitude} = elementDoc.data();
    const key = `${latitude},${longitude}`;
    locationCounts[key] = (locationCounts[key] || 0) + 1;
  }
}

// Render heatmap using Leaflet.heat
```

### 3. User Drop-off Points
**Visualization**: Funnel chart or line chart

**Metrics**:
- Percentage of users who complete 1, 2, 3... N locations
- Average drop-off location (which location in sequence users stop)
- Time between check-ins (engagement metric)

**Query**:
```javascript
// Get visits ordered chronologically per user per tour
const visitsSnapshot = await db.collection('tour_visits')
  .where('tourId', '==', selectedTourId)
  .orderBy('userId')
  .orderBy('visitedAt', 'asc')
  .get();

// Group by userId and count locations
const userProgressCounts = {};
visitsSnapshot.forEach(doc => {
  const {userId} = doc.data();
  userProgressCounts[userId] = (userProgressCounts[userId] || 0) + 1;
});

// Calculate distribution
const dropoffDistribution = {};
Object.values(userProgressCounts).forEach(count => {
  dropoffDistribution[count] = (dropoffDistribution[count] || 0) + 1;
});
```

### 4. Temporal Patterns
**Visualization**: Time-series chart

**Metrics**:
- Check-ins per day/hour
- Peak tour times
- Average tour duration (first to last check-in per user)

**Query**:
```javascript
// Get visits with timestamps
const visitsSnapshot = await db.collection('tour_visits')
  .where('tourId', '==', selectedTourId)
  .orderBy('visitedAt', 'desc')
  .limit(500)
  .get();

// Group by hour of day
const hourCounts = Array(24).fill(0);
visitsSnapshot.forEach(doc => {
  const {visitedAt} = doc.data();
  const hour = visitedAt.toDate().getHours();
  hourCounts[hour]++;
});

// Render line chart with Chart.js
```

## Implementation Files

### Create `tour-analytics.html`
- Copy structure from `dashboard.html`
- Replace map with tour-specific visualizations
- Add filters: select tour, date range, user cohort

### Create `js/tour-analytics.js`
- Export Firestore data for tour_visits collection
- Implement visualization logic using Chart.js and Leaflet
- Add real-time updates when new check-ins occur

### Update `export-firebase-data.js`
```javascript
// Add tour_visits export
async function exportTourVisits() {
  const db = admin.firestore();
  const snapshot = await db.collection('tour_visits')
    .orderBy('visitedAt', 'desc')
    .limit(10000)
    .get();

  const visits = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    visitedAt: doc.data().visitedAt?.toDate()?.toISOString()
  }));

  fs.writeFileSync('data/tour_visits.json', JSON.stringify(visits, null, 2));
  console.log(`Exported ${visits.length} tour visits`);
}
```

## UI Layout

```
+---------------------------------------------+
| Tour Analytics Dashboard                     |
+---------------------------------------------+
| Filters:                                    |
|   [Select Tour ▼] [Date Range ▼]           |
+---------------------------------------------+
| Completion Rates                            |
|   Tour A: █████████░░░ 85% (45/50 users)   |
|   Tour B: ███████░░░░░ 65% (30/50 users)   |
+---------------------------------------------+
| Drop-off Funnel                             |
|   Location 1: ██████████ 100 users         |
|   Location 2: ████████░░  80 users         |
|   Location 3: ██████░░░░  60 users         |
|   Location 4: ████░░░░░░  40 users         |
+---------------------------------------------+
| Visit Heatmap                               |
|   [Map with colored circles by visit count]|
+---------------------------------------------+
| Peak Times                                  |
|   [Line chart: check-ins per hour]         |
+---------------------------------------------+
```

## Future Enhancements

1. **User Segmentation**: Filter by user cohort (power users vs new users)
2. **A/B Testing**: Compare tour completion rates across different tour designs
3. **Real-time Alerts**: Notify when completion rate drops below threshold
4. **Export Reports**: Download tour analytics as PDF/CSV
5. **Location Feedback**: Integrate with element ratings to correlate popularity with quality

## Integration with Existing Dashboard

Add navigation link in `dashboard.html`:
```html
<nav>
  <a href="dashboard.html">Location Data</a>
  <a href="tour-analytics.html" class="active">Tour Analytics</a>
  <a href="narrative-history.html">Narrative History</a>
  <a href="admin.html">Admin</a>
</nav>
```
