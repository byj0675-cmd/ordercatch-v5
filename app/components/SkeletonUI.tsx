"use client";

import React from "react";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div 
      className={`skeleton ${className || ""}`} 
      style={style}
    />
  );
}

export function OrderCardSkeleton() {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 18,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      border: "1px solid rgba(0,0,0,0.05)",
      marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Skeleton style={{ width: 60, height: 20, borderRadius: 10 }} />
        <Skeleton style={{ width: 100, height: 20, borderRadius: 6 }} />
      </div>
      <Skeleton style={{ width: "80%", height: 16, borderRadius: 4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <Skeleton style={{ width: 120, height: 14, borderRadius: 4 }} />
        <Skeleton style={{ width: 60, height: 16, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ padding: "16px 20px" }}>
      {/* Summary Bento Header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
        <Skeleton style={{ height: 100, borderRadius: 20 }} />
        <Skeleton style={{ height: 100, borderRadius: 20 }} />
      </div>
      
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Skeleton style={{ width: 120, height: 28, borderRadius: 8 }} />
        <div style={{ display: "flex", gap: 8 }}>
           <Skeleton style={{ width: 80, height: 36, borderRadius: 12 }} />
           <Skeleton style={{ width: 80, height: 36, borderRadius: 12 }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <OrderCardSkeleton />
        <OrderCardSkeleton />
        <OrderCardSkeleton />
        <OrderCardSkeleton />
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div style={{ padding: "0 16px" }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <Skeleton style={{ width: 140, height: 24, borderRadius: 8, marginBottom: 12 }} />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      ))}
    </div>
  );
}
