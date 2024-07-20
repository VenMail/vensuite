<script lang="ts">
import { reactive, ref } from 'vue'
import CassieDesignEditor from '../components/CassieDesignEditor.vue'

import { UnitConversion } from '../extension/page/core'
import { pageContent } from './content'

import { WIDGET_BASE_LIST } from '@/design/config'

const unitConversion = new UnitConversion()
export default {
  components: {
    CassieDesignEditor,
  },
  setup() {
    const header = ref(true)
    const currentindex = ref(0)
    // 页眉data
    const headerlist = reactive([
      {
        id: 2,
        x: 312,
        y: 24,
        w: 180,
        h: 26,
        focused: false,
        value: '烟台市口腔医院病历',
        label: '文字',
        component: 'custom-text',
        type: 'text',
        styles: {
          color: '#000000',
          fontSize: '18px',
          fontWeight: 'bold',
        },
        handles: ['mr', 'bm'],
      },
    ])
    // 页脚
    const footerlist = reactive([
      {
        id: 3,
        x: 292,
        y: 19,
        w: 100,
        h: 26,
        focused: false,
        value: '我是一个页脚',
        label: '文字',
        component: 'custom-text',
        type: 'text',
        styles: {
          color: '#000000',
          fontSize: 18,
        },
      },
      {
        id: 4,
        x: 636,
        y: 43,
        w: 100,
        h: 26,
        focused: false,
        value: '第一页',
        label: '页码',
        component: 'page-count',
        type: 'text',
        styles: {
          color: '#000000',
          fontSize: 18,
        },
      },
    ])
    const h = unitConversion.mmConversionPx(148)
    const w = unitConversion.mmConversionPx(210)
    // 基础配置参数
    const page = reactive({
      design: true,
      bodyHeight: h - 100,
      bodyWidth: w,
      bodyPadding: 10,
      isPaging: true,
      headerHeight: 100,
      footerHeight: 100,
      SystemAttributes: {},
    })
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
    return {
      page,
      header,
      currentindex,
      headerlist,
      footerlist,
      pageContent,
      WIDGET_BASE_LIST,
    }
  },
}
</script>

<template>
  <CassieDesignEditor :content="pageContent" :header-data="headerlist" :footer-data="footerlist" :widget-list="WIDGET_BASE_LIST" />
</template>

<style scoped>
.ProseMirror-focused {
}
</style>
