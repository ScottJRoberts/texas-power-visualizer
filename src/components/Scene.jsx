import './Scene.css';

// A room and a lamp. Brightness is a ratio, never a boolean — partial supply
// reads as a dim room, which is both more honest than a blackout and more
// alarming to look at.
function Scene({ lit, children }) {
  return (
    <div className="room" style={{ '--lit': lit.toFixed(3) }}>
      <div className="room__ceiling">
        <div className="room__cord" />
        <div className="room__shade" />
        <div className="room__bulb" />
      </div>

      <div className="room__readout">{children}</div>
    </div>
  );
}

export default Scene;
