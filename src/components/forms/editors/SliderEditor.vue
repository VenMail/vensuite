<template>
  <div class="slider-editor">
    <h3>{{ modelValue.type === 'slider' ? $t('Commons.heading.slider') : $t('Commons.heading.range') }} {{$t('Commons.heading.properties')}}</h3>

    <label>
      Min Value:
      <input :value="modelValue.min" type="number" @input="onMinInput" />
    </label>

    <label>
      Max Value:
      <input :value="modelValue.max" type="number" @input="onMaxInput" />
    </label>

    <label>
      Step:
      <input :value="modelValue.step" type="number" @input="onStepInput" />
    </label>

    <label>
      {{$t('Commons.label.show_labels')}}
      <input :checked="modelValue.show_labels === true" type="checkbox" @change="onShowLabelsChange" />
    </label>

    <div v-if="modelValue.show_labels">
      <h4>{{$t('Commons.heading.customize_labels')}}</h4>
      <div class="label-option">
        <input :value="modelValue.left_label || ''" type="text" placeholder="Left label" @input="onLeftLabelInput" />
        <input :value="modelValue.right_label || ''" type="text" placeholder="Right label" @input="onRightLabelInput" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { SliderQuestion } from '@/types';

export default defineComponent({
  name: 'SliderEditor',
  props: {
    modelValue: {
      type: Object as PropType<SliderQuestion>,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    function emitUpdate(patch: Partial<SliderQuestion>) {
      emit('update:modelValue', { ...props.modelValue, ...patch });
    }

    function onMinInput(event: Event) {
      const target = event.target as HTMLInputElement;
      const min = Number(target.value);
      emitUpdate({ min });
    }

    function onMaxInput(event: Event) {
      const target = event.target as HTMLInputElement;
      const max = Number(target.value);
      emitUpdate({ max });
    }

    function onStepInput(event: Event) {
      const target = event.target as HTMLInputElement;
      const step = Number(target.value);
      emitUpdate({ step });
    }

    function onShowLabelsChange(event: Event) {
      const target = event.target as HTMLInputElement;
      emitUpdate({ show_labels: target.checked });
    }

    function onLeftLabelInput(event: Event) {
      const target = event.target as HTMLInputElement;
      emitUpdate({ left_label: target.value });
    }

    function onRightLabelInput(event: Event) {
      const target = event.target as HTMLInputElement;
      emitUpdate({ right_label: target.value });
    }

    return {
      onMinInput,
      onMaxInput,
      onStepInput,
      onShowLabelsChange,
      onLeftLabelInput,
      onRightLabelInput,
    };
  },
});
</script>

<style scoped>
.slider-editor {
  margin-top: 20px;
}

label {
  display: block;
  margin-bottom: 10px;
}

input[type="number"], input[type="text"] {
  width: 100%;
  padding: 5px;
  margin-top: 5px;
}

input[type="checkbox"] {
  margin-right: 5px;
}

.label-option {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.label-option input {
  margin-right: 10px;
}

button {
  margin-left: 10px;
}
</style>