import { useState, useEffect } from 'react';

function Loader() {
  const [loadingText, setLoadingText] = useState("Loading...");

  useEffect(() => {
    // Change text after 3 seconds
    const timer = setTimeout(() => {
      setLoadingText("Service waking up...");
    }, 3000);

    return () => clearTimeout(timer); // Cleanup on unmount
  }, []);

  return (
    <div className="terminal-loader">
      <div className="terminal-header">
        <div className="terminal-title">Manakakura Status</div>
        <div className="terminal-controls">
          <div className="control close"></div>
          <div className="control minimize"></div>
          <div className="control maximize"></div>
        </div>
      </div>
      {/* Key is used here to restart the CSS animation when text changes */}
      <div className="text" key={loadingText}>
        {loadingText}
      </div>
    </div>
  );
}

export default Loader;