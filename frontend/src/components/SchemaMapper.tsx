"use client";

import React, { useState } from "react";

interface SchemaMapperProps {
  headers: string[];
  onMappingComplete: (mapping: Record<string, string>) => void;
}

const REQUIRED_FIELDS = [
  "customer_id",
  "order_id",
  "order_date",
  "total_amount",
];

export default function SchemaMapper({ headers, onMappingComplete }: SchemaMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const handleSelect = (requiredField: string, sourceHeader: string) => {
    setMapping((prev) => ({
      ...prev,
      [requiredField]: sourceHeader,
    }));
  };

  const handleSubmit = () => {
    // Validate all required fields are mapped
    const isComplete = REQUIRED_FIELDS.every((field) => mapping[field]);
    if (isComplete) {
      onMappingComplete(mapping);
    } else {
      alert("Please map all required fields.");
    }
  };

  return (
    <div className="p-6 bg-white shadow rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Map Your CSV Columns</h2>
      <div className="space-y-4">
        {REQUIRED_FIELDS.map((field) => (
          <div key={field} className="flex items-center justify-between">
            <span className="font-medium w-1/3">{field}</span>
            <select
              className="w-2/3 border border-gray-300 rounded p-2"
              value={mapping[field] || ""}
              onChange={(e) => handleSelect(field, e.target.value)}
            >
              <option value="" disabled>Select a column...</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
      >
        Confirm Mapping & Ingest
      </button>
    </div>
  );
}
