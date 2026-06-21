"use client";

import { ToastContainer } from "react-toastify";

export function ToastProvider() {
  return (
    <ToastContainer
      autoClose={4000}
      closeButton={false}
      draggable={false}
      hideProgressBar
      icon={false}
      newestOnTop
      pauseOnFocusLoss={false}
      position="bottom-right"
      theme="dark"
      limit={3}
    />
  );
}
