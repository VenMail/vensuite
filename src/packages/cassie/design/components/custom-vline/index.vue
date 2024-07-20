<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CustomVline',
  // 变量通过props传参
  // 逻辑通过触发自定义事件来实现
  props: {
    editor: {
      type: Object,
      required: false,
    },
    node: {
      type: Object,
      required: false,
    },
    extension: {
      type: Object,
      required: false,
    },
    value: String,
    styles: Object,
  },
})
</script>

<template>
  <div class="line" />
</template>

<style scoped>
.line {
  border-right: 1px solid black;
}
</style>
