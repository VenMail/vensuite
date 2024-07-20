<script lang="ts">
import { getCurrentInstance } from 'vue'
import CassieEditor from '../components/CassieEditor.vue'
import { footerlist, headerlist, signContent } from './content'

export default {
  components: { CassieEditor },
  setup() {
    const { ctx } = getCurrentInstance()
    const menulist = [
      {
        classify: 'image',
        label: '签名',
        value: 'image',
      },
    ]
    const onUpdate = (output: any, editor: any) => {
      /*      console.log(output);
            console.log(editor); */
    }
    const onCreate = (option: any) => {
      console.log(option)
    }
    return { signContent, menulist, headerlist, footerlist, onUpdate, onCreate }
  },
}
</script>

<template>
  <CassieEditor :content="signContent" :is-paging="true" :body-width="750" :menu-list="menulist" @on-create="onCreate" @on-update="onUpdate" />
</template>

<style scoped></style>
