<template>
  <div class="pagination">
    <button :disabled="currentPage === 1" @click="changePage(currentPage - 1)">Previous</button>
    <span>Page {{ currentPage }} of {{ totalPages }}</span>
    <button :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">Next</button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Pagination',
  props: {
    currentPage: {
      type: Number,
      required: true,
    },
    totalPages: {
      type: Number,
      required: true,
    },
  },
  emits: ['page-changed'],
  setup(_props, { emit }) {
    const changePage = (page: number) => {
      emit('page-changed', page);
    };

    return {
      changePage,
    };
  },
});
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}
</style>
