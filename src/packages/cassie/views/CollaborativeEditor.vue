<script lang="ts">
import { getCurrentInstance, ref } from 'vue'
import CassieEditor from '../components/CassieEditor.vue'
import { footerlist, headerlist, pageContentHtml } from './content'
import { getRandomColor, getRandomName } from '@/denoutils'
import { UnitConversion } from '@/extension/page/core'

const unitConversion = new UnitConversion()
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
    const userLenth = ref([])
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const onUpdate = (output: any, editor: any) => {}
    const onStatus = (data: any, editor: any) => {}
    const onAwarenessChange = (data: any) => {
      userLenth.value = data.states
    }
    const onCreate = (option: any) => {
      console.log(option)
    }
    const user = { name: getRandomName(), color: getRandomColor() }
    const url = 'ws://39.101.177.50:1234'
    const w = unitConversion.mmConversionPx(210)
    const h = unitConversion.mmConversionPx(297)
    return { w, h, user, pageContentHtml, menulist, headerlist, footerlist, onUpdate, onStatus, onCreate, url, userLenth, onAwarenessChange }
  },
}
</script>

<template>
  <footer class="footer footer-center p-4 bg-base-300 text-base-content">
    <div class="chat chat-start">
      <div class="chat-bubble chat-bubble-primary">
        在线人数+{{ userLenth.length }}
      </div>
    </div>
    <div class="avatar-group">
      <div v-for="(item, index) in userLenth" :key="index" class="avatar placeholder">
        <div :style="{ background: item.user.color ? item.user.color : '' }" class="text-neutral-content rounded-full w-24">
          <span>{{ item.user.name }}</span>
        </div>
      </div>
    </div>
  </footer>
  <CassieEditor
    :user="user"
    footer-height="50"
    :body-width="w"
    :body-height="h"
    :content="pageContentHtml"
    :is-paging="false"
    :collaboration-url="url"
    :body-width="750"
    :menu-list="menulist"
    :header-data="headerlist"
    :footer-data="footerlist"
    @on-create="onCreate"
    @on-status="onStatus"
    @on-awareness-change="onAwarenessChange"
    @on-update="onUpdate"
  />
</template>

<style scoped></style>
