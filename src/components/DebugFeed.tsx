import React from 'react';
import useStoredFeed from '@theme/useStoredFeed';

interface DebugFeedProps {
  feedId: string;
  title: string;
}

const DebugFeed: React.FC<DebugFeedProps> = ({ feedId, title }) => {
  try {
    const feedData = useStoredFeed(feedId);
    
    return (
      <div style={{ border: '1px solid #ccc', padding: '1rem', margin: '1rem 0' }}>
        <h3>{title}</h3>
        <pre style={{ fontSize: '0.8rem', overflow: 'auto', maxHeight: '300px' }}>
          {JSON.stringify(feedData, null, 2)}
        </pre>
      </div>
    );
  } catch (error) {
    return (
      <div style={{ border: '1px solid red', padding: '1rem', margin: '1rem 0' }}>
        <h3>{title}</h3>
        <p style={{ color: 'red' }}>Error: {error?.toString()}</p>
      </div>
    );
  }
};

export default DebugFeed;