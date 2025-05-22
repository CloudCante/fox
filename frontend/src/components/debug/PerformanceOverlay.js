import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, IconButton, Collapse } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

// Only show in development mode
const isDev = process.env.NODE_ENV === 'development';

/**
 * A floating overlay that displays performance metrics
 * Only visible in development mode
 */
export const PerformanceOverlay = () => {
  // Skip rendering in production
  if (!isDev) return null;
  
  const [isVisible, setIsVisible] = useState(true); // Start visible by default
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded by default
  const [isRecording, setIsRecording] = useState(false); // Start NOT recording by default
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    renders: {},
    eventCount: 0,
    lastLagDuration: 0
  });
  
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const renderCountsRef = useRef({});
  const eventCountRef = useRef(0);
  const rafIdRef = useRef(null);
  const originalCreateElementRef = useRef(null);
  const originalAddEventListenerRef = useRef(null);
  
  // Toggle visibility
  const toggleVisibility = () => setIsVisible(!isVisible);
  
  // Toggle expanded state
  const toggleExpanded = () => setIsExpanded(!isExpanded);
  
  // Toggle recording state
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      // Restore original methods if they were saved
      if (originalCreateElementRef.current) {
        React.createElement = originalCreateElementRef.current;
      }
      
      if (originalAddEventListenerRef.current) {
        EventTarget.prototype.addEventListener = originalAddEventListenerRef.current;
      }
    } else {
      setIsRecording(true);
    }
  };
  
  // Clear metrics
  const clearMetrics = () => {
    setMetrics({
      fps: 0,
      memory: 0,
      renders: {},
      eventCount: 0,
      lastLagDuration: 0
    });
    renderCountsRef.current = {};
    eventCountRef.current = 0;
  };
  
  // Start performance recording
  const startRecording = () => {
    // Start counting frames for FPS
    const updateMetrics = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastFrameTimeRef.current;
      
      // Update metrics every second
      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        
        // Get memory usage if available
        let memory = 0;
        if (window.performance && window.performance.memory) {
          memory = Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024));
        }
        
        setMetrics(prev => ({
          ...prev,
          fps,
          memory,
          renders: {...renderCountsRef.current},
          eventCount: eventCountRef.current
        }));
        
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }
      
      // Check for large gaps between frames (lag)
      if (elapsed > 50) { // Anything over 50ms is considered lag (less than 20fps)
        setMetrics(prev => ({
          ...prev,
          lastLagDuration: Math.round(elapsed)
        }));
      }
      
      rafIdRef.current = requestAnimationFrame(updateMetrics);
    };
    
    rafIdRef.current = requestAnimationFrame(updateMetrics);
    
    // Only patch React.createElement if it hasn't been patched yet
    if (!originalCreateElementRef.current) {
      // Save original method
      originalCreateElementRef.current = React.createElement;
      
      // Track component renders - safer implementation
      React.createElement = function(type, props, ...children) {
        if (typeof type === 'function') {
          const componentName = type.displayName || type.name || 'AnonymousComponent';
          
          // Create a safer wrapped component that handles null props
          const wrappedComponent = function(props = {}) {
            if (!renderCountsRef.current[componentName]) {
              renderCountsRef.current[componentName] = 0;
            }
            renderCountsRef.current[componentName]++;
            
            return type(props);
          };
          
          wrappedComponent.displayName = componentName;
          return originalCreateElementRef.current(wrappedComponent, props || {}, ...children);
        }
        
        return originalCreateElementRef.current(type, props, ...children);
      };
    }
    
    // Only patch addEventListener if it hasn't been patched yet
    if (!originalAddEventListenerRef.current) {
      // Save original method
      originalAddEventListenerRef.current = EventTarget.prototype.addEventListener;
      
      // Track events
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        // Handle null listener
        if (!listener) return originalAddEventListenerRef.current.call(this, type, listener, options);
        
        const wrappedListener = function(...args) {
          eventCountRef.current++;
          return listener.apply(this, args);
        };
        
        return originalAddEventListenerRef.current.call(this, type, wrappedListener, options);
      };
    }
  };
  
  // Start recording when component mounts or when isRecording changes
  useEffect(() => {
    if (isRecording) {
      startRecording();
      
      // Cleanup function
      return () => {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        
        // Restore original methods when unmounting
        if (originalCreateElementRef.current) {
          React.createElement = originalCreateElementRef.current;
          originalCreateElementRef.current = null;
        }
        
        if (originalAddEventListenerRef.current) {
          EventTarget.prototype.addEventListener = originalAddEventListenerRef.current;
          originalAddEventListenerRef.current = null;
        }
      };
    }
  }, [isRecording]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      
      // Restore original methods when unmounting
      if (originalCreateElementRef.current) {
        React.createElement = originalCreateElementRef.current;
      }
      
      if (originalAddEventListenerRef.current) {
        EventTarget.prototype.addEventListener = originalAddEventListenerRef.current;
      }
    };
  }, []);
  
  const fpsColor = metrics.fps > 55 ? 'success.main' : 
                  metrics.fps > 30 ? 'warning.main' : 'error.main';
  
  const memoryColor = metrics.memory < 100 ? 'success.main' :
                     metrics.memory < 200 ? 'warning.main' : 'error.main';
  
  // Get the top 3 most frequently rendering components
  const topRenderingComponents = Object.entries(metrics.renders)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  
  return (
    <Paper 
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        maxWidth: isExpanded ? 300 : 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        transition: 'all 0.3s ease'
      }}
    >
      {!isVisible ? (
        <IconButton 
          color="primary" 
          onClick={toggleVisibility}
          sx={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <SpeedIcon />
        </IconButton>
      ) : (
        <Box sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" component="div" sx={{ fontWeight: 'bold' }}>
              Performance Monitor
            </Typography>
            <Box>
              <IconButton 
                size="small" 
                onClick={toggleExpanded}
                sx={{ color: 'white', p: 0.5 }}
              >
                {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
              <IconButton 
                size="small" 
                onClick={toggleVisibility}
                sx={{ color: 'white', p: 0.5 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" component="div" color={fpsColor}>
              FPS: {metrics.fps}
            </Typography>
            <Typography variant="body2" component="div" color={memoryColor}>
              Memory: {metrics.memory} MB
            </Typography>
          </Box>
          
          {metrics.lastLagDuration > 0 && (
            <Typography variant="body2" component="div" color="error.main" sx={{ mb: 1 }}>
              Last lag: {metrics.lastLagDuration}ms
            </Typography>
          )}
          
          <Collapse in={isExpanded}>
            <Typography variant="body2" component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
              Top Renders:
            </Typography>
            {topRenderingComponents.map(([component, count]) => (
              <Typography key={component} variant="body2" component="div" sx={{ ml: 1 }}>
                {component}: {count}
              </Typography>
            ))}
            
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              Event count: {metrics.eventCount}
            </Typography>
          </Collapse>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <IconButton 
              size="small" 
              onClick={toggleRecording}
              sx={{ color: isRecording ? 'error.main' : 'success.main', p: 0.5 }}
            >
              {isRecording ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
            
            <Typography 
              variant="caption" 
              component="div" 
              onClick={clearMetrics}
              sx={{ 
                cursor: 'pointer', 
                textDecoration: 'underline',
                alignSelf: 'center',
                '&:hover': { color: 'primary.main' }
              }}
            >
              Clear
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}; 