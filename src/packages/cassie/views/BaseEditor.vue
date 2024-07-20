<script lang="ts">
import { getCurrentInstance } from 'vue'
import CassieEditor from '../components/CassieEditor.vue'
import { footerlist, headerlist, pageContentHtml } from './content'

export default {
  components: { CassieEditor },
  setup() {
    const { ctx } = getCurrentInstance()
    const menulist = [
      { classify: 'radio', label: '单选', value: 'radio' },
      {
        classify: 'checkbox',
        label: '多选',
        value: 'checkbox',
      },
      {
        classify: 'date',
        label: '日期',
        value: 'date',
      },
    ]
    const onUpdate = (output: any, editor: any) => {
      console.log(output)
      console.log(editor)
    }
    const onCreate = (option: any) => {
      console.log(option)
    }
    return { pageContentHtml, menulist, headerlist, footerlist, onUpdate, onCreate }
  },
}
</script>

<template>
  <CassieEditor :content="pageContentHtml" :is-paging="false" :body-width="1000" output="json" :menu-list="menulist" @on-create="onCreate" @on-update="onUpdate" />
</template>

<style scoped></style>
