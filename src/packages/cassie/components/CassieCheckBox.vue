<script>
export default {
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
  data() {
    return {
      isIndeterminate: true,
      checkAll: false,
      checkeditems: [],
      items: [
        {
          id: '1',
          name: '多选1',
          checked: false,
          bustype: 'mutselect',
        },
        {
          id: '2',
          name: '多选2',
          checked: false,
          bustype: 'mutselect',
        },
        {
          id: '3',
          name: '多选3',
          checked: false,
          bustype: 'mutselect',
        },
      ],
    }
  },
  mounted() {
    // 根据
    const selectData = this.selectItem()
    console.log(selectData)
  },

  methods: {
    change(e, item) {
      item.checked = e.target.checked
    },
    quit() {
      this.onExit()
    },
    onSubmit() {
      const checkeditems = this.items.filter(item => item.checked).map(item => item.name)
      if (checkeditems.length > 0) {
        this.command({ classify: 'checkbox', label: checkeditems.join(',') })
      }
      if (this.onExit) {
        this.onExit()
      }
    },
    handleCheckedChange(value) {
      console.log(value)
    },
  },
}
</script>

<template>
  <div class="card bg-base-100 shadow-xl join join-vertical border">
    <div class="card-body form-control p-2.5">
      <label v-for="(item, index) in items" :key="index" class="cursor-pointer label join-item">
        <span class="label-text">{{ item.name }}</span>
        <input type="checkbox" class="checkbox checkbox-md checkbox-info" @change="(e) => change(e, item)">
      </label>
    </div>
    <div class="card-actions justify-end px-4 py-2">
      <div class="badge badge-outline" @click="onSubmit">
        确定
      </div>
      <div class="badge badge-outline" @click="quit">
        取消
      </div>
    </div>
  </div>
</template>

<style lang="scss"></style>
