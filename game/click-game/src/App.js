import React, { useState, useEffect } from "react";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "./App.css";

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 150;
const RECT_HEIGHT = CANVAS_HEIGHT / 3;

const SHAKE_WINDOW_MS = 1000; // Time window to track shakes
const SHAKE_COUNT_THRESHOLD = 7; // Number of shakes required
const SHAKE_MAGNITUDE_THRESHOLD = 7; // Minimum acceleration to count as a shake
const DEBOUNCE_TIME_MS = 3000; // Cooldown period after a shake
const LOW_PASS_FILTER_FACTOR = 0.8; // Smoothing factor for accelerometer readings

let motionEvents = [];
let lastShakeTime = 0;
let smoothedX = 0,
  smoothedY = 0,
  smoothedZ = 0;

function App() {
  const [flagParts, setFlagParts] = useState([
    { id: "orange", color: "orange", order: 0 },
    { id: "white", color: "white", order: 1 },
    { id: "green", color: "green", order: 2 },
  ]);

  const [isShaken, setIsShaken] = useState(false);

  // Shake detection
  useEffect(() => {
    if (typeof window !== "undefined" && window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", handleMotion, true);
    }

    return () => {
      window.removeEventListener("devicemotion", handleMotion, true);
    };
  }, []);

  const handleMotion = (event) => {
    const { acceleration } = event;

    if (!acceleration) return;

    const rawX = acceleration.x ?? 0;
    const rawY = acceleration.y ?? 0;
    const rawZ = acceleration.z ?? 0;

    smoothedX = rawX * (1 - LOW_PASS_FILTER_FACTOR) + smoothedX * LOW_PASS_FILTER_FACTOR;
    smoothedY = rawY * (1 - LOW_PASS_FILTER_FACTOR) + smoothedY * LOW_PASS_FILTER_FACTOR;
    smoothedZ = rawZ * (1 - LOW_PASS_FILTER_FACTOR) + smoothedZ * LOW_PASS_FILTER_FACTOR;

    const magnitude = Math.sqrt(smoothedX ** 2 + smoothedY ** 2);

    if (magnitude < SHAKE_MAGNITUDE_THRESHOLD) return;

    const currentTime = Date.now();

    motionEvents.push({ timestamp: currentTime, x: smoothedX, y: smoothedY });

    // Remove old events
    motionEvents = motionEvents.filter((event) => currentTime - event.timestamp < SHAKE_WINDOW_MS);

    if (motionEvents.length >= SHAKE_COUNT_THRESHOLD) {
      if (currentTime - lastShakeTime > DEBOUNCE_TIME_MS) {
        console.log("Shake detected! Breaking the flag...");
        breakFlag();
        lastShakeTime = currentTime;
      }
      motionEvents = []; // Clear motion events after successful shake
    }
  };

  const breakFlag = () => {
    setIsShaken(true);
    shuffleFlagParts();
  };

  const shuffleFlagParts = () => {
    const shuffledParts = [...flagParts].sort(() => Math.random() - 0.5);
    setFlagParts(shuffledParts);
  };

  const resetGame = () => {
    setFlagParts([
      { id: "orange", color: "orange", order: 0 },
      { id: "white", color: "white", order: 1 },
      { id: "green", color: "green", order: 2 },
    ]);
    setIsShaken(false);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="game-container">
        <h1>Indian Flag Game</h1>

        <div className="canvas" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          {!isShaken ? (
            // Render the flag in its original form
            flagParts
              .sort((a, b) => a.order - b.order)
              .map((part, index) => (
                <div
                  key={part.id}
                  style={{
                    height: RECT_HEIGHT,
                    backgroundColor: part.color,
                    border: "1px solid black",
                  }}
                />
              ))
          ) : (
            // Render drop zones for the flag parts
            flagParts.map((part, index) => (
              <FlagDropZone
                key={index}
                expectedId={part.id}
                onDrop={(droppedId) => {
                  const newOrder = [...flagParts];
                  const partIndex = newOrder.findIndex((p) => p.id === droppedId);
                  newOrder[partIndex].order = index;
                  setFlagParts(newOrder);
                }}
              />
            ))
          )}
        </div>

        {isShaken && (
          <div className="flag-parts">
            {flagParts.map((part) => (
              <FlagPart key={part.id} id={part.id} color={part.color} />
            ))}
          </div>
        )}

        <button className="reset-button" onClick={resetGame}>
          Reset Game
        </button>
      </div>
    </DndProvider>
  );
}

function FlagPart({ id, color }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "flagPart",
    item: { id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        backgroundColor: color,
        width: "100px",
        height: "50px",
        margin: "10px",
        opacity: isDragging ? 0.5 : 1,
        cursor: "grab",
        border: "1px solid black",
      }}
    ></div>
  );
}

function FlagDropZone({ expectedId, onDrop }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "flagPart",
    drop: (item) => {
      if (item.id === expectedId) {
        onDrop(item.id);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop}
      style={{
        width: "300px",
        height: "50px",
        marginBottom: "0",
        border: "1px dashed black",
        backgroundColor: isOver ? "lightgray" : "transparent",
      }}
    ></div>
  );
}

export default App;
