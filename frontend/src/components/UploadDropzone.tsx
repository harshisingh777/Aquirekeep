"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";

interface UploadDropzoneProps {
  onDataParsed: (data: any[], headers: string[]) => void;
}

export default function UploadDropzone({ onDataParsed }: UploadDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            onDataParsed(results.data, results.meta.fields);
          }
        },
      });
    }
  }, [onDataParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-blue-500 font-medium">Drop the CSV file here ...</p>
      ) : (
        <p className="text-gray-600">Drag & drop a CSV dataset here, or click to select a file</p>
      )}
    </div>
  );
}
