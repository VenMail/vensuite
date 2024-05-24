<template>
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger
          class="text-grass11 shadow-blackA7 hover:bg-green3 inline-flex h-[35px] w-[35px] items-center justify-center rounded-full bg-white shadow-[0_2px_10px] outline-none focus:shadow-[0_0_0_2px] focus:shadow-black"
        >
          <VIcon :name="icon" />
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent
            class="data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade text-grass11 select-none rounded-[4px] bg-white px-[15px] py-[10px] text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
            :side-offset="5"
          >
            {{ tooltip }}
            <TooltipArrow class="fill-white" :width="8" />
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </TooltipProvider>
  </template>

  <script lang="ts">
  import { defineComponent } from 'vue';
  import VIcon from '@/components/VIcon.vue';
  import { TooltipArrow, TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from 'radix-vue'

  export default defineComponent({
    components: {
      VIcon,
    },
    props: {
      icon: {
        type: String,
        required: true,
      },
  
      isActive: {
        type: Boolean,
        default: false,
      },
  
      tooltip: {
        type: String,
        required: true,
      },
  
      enableTooltip: {
        type: Boolean,
        required: true,
      },
  
      command: {
        type: Function,
        default: void {},
      },
  
      readonly: {
        type: Boolean,
        default: false,
      },
    },
  
    computed: {
      commandButtonClass(): object {
        return {
          'el-tiptap-editor__command-button': true,
          'el-tiptap-editor__command-button--active': this.isActive,
          'el-tiptap-editor__command-button--readonly': this.readonly,
        };
      },
    },
  
    methods: {
      onClick() {
        if (!this.readonly) this.command?.();
      },
    },
  });
  </script>
  