import React from "react";

export default function Loader() {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500" />
    </div>
  );
}
