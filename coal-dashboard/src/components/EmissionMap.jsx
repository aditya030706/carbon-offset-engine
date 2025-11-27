import React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const emissionHotspots = [
  { state: "Jharkhand", lat: 23.6102, lng: 85.2799, emission: "High – 180 Mt CO₂" },
  { state: "Odisha", lat: 20.9517, lng: 85.0985, emission: "High – 165 Mt CO₂" },
  { state: "Chhattisgarh", lat: 21.2787, lng: 81.8661, emission: "Very High – 210 Mt CO₂" },
  { state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, emission: "Moderate – 120 Mt CO₂" },
  { state: "Maharashtra", lat: 19.7515, lng: 75.7139, emission: "Moderate – 110 Mt CO₂" },
];

const EmissionMap = () => {
  return (
    <div className="w-full h-[700px] rounded-2xl overflow-hidden shadow-xl border border-slate-700 bg-slate-800/40 backdrop-blur-xl">
      <MapContainer
        center={[22.9734, 78.6569]} // India center
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {emissionHotspots.map((spot, index) => (
          <CircleMarker
            key={index}
            center={[spot.lat, spot.lng]}
            radius={20}
            pathOptions={{
              color: "#ef4444",
              fillColor: "#ef4444",
              fillOpacity: 0.5,
            }}
          >
            <Popup>
              <div className="text-black">
                <h2 className="font-bold">{spot.state}</h2>
                <p>{spot.emission}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default EmissionMap;
