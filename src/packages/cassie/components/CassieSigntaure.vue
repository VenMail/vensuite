<script>
import { VueSignaturePad } from 'vue-signature-pad'

export default {
  components: { VueSignaturePad },
  props: {
    selectItem: {
      type: Function,
      required: true,
    },
    command: {
      type: Function,
      required: true,
    },
    onExit: {
      type: Function,
    },
  },
  data: () => ({
    penColor: '#100f10',
    isIndeterminate: true,
  }),
  mounted() {
    // 根据
    const selectData = this.selectItem()
    console.log(selectData)
  },

  methods: {
    save() {
      const { isEmpty, data } = this.$refs.signaturePad.saveSignature()
      this.$parent.editor.chain().focus().setImage({ src: data }).run()
      if (this.onExit) {
        this.onExit()
      }
    },
    quit() {
      this.onExit()
    },
  },
}
</script>

<template>
  <div class="card w-96 bg-base-100 shadow-xl border">
    <figure><VueSignaturePad id="signature" ref="signaturePad" width="400px" height="100px" :options="options" /></figure>
    <div class="card-actions justify-end px-4 py-2">
      <div class="badge badge-outline" @click="save">
        确定
      </div>
      <div class="badge badge-outline" @click="quit">
        取消
      </div>
    </div>
  </div>
</template>

<style lang="scss"></style>
