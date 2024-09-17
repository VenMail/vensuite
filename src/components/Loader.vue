<!-- Loader.vue -->
<template>
    <div class="flex justify-center items-center h-screen">
      <div class="loader">Loading...</div>
    </div>
  </template>
  
  <script setup lang="ts">
  </script>
  
  <style scoped>
  .loader {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-left-color: #3498db;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  </style>
  