<template>
    <div class="logic-editor">
      <h3>Logic</h3>
      <div>
        <label for="if">{{$t('Forms.Editors.LogicEditor.label.if_question_id')}}</label>
        <input v-model="logic.if" id="if" placeholder="Question ID" />
      </div>
      <div>
        <label for="value">Value:</label>
        <input v-model="logic.value" id="value" placeholder="Expected Value" />
      </div>
      <div>
        <label for="matchType">Match Type:</label>
        <select v-model="logic.matchType">
          <option value="equal">Equal</option>
          <option value="greater">Greater</option>
          <option value="less">Less</option>
          <option value="contains">Contains</option>
          <option value="regex">Regex</option>
        </select>
      </div>
      <div>
        <label for="jump">{{$t('Forms.Editors.LogicEditor.label.jump_to_question_id')}}</label>
        <input v-model="logic.jump" id="jump" placeholder="Question ID to jump to" />
      </div>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, PropType } from "vue";
  import { Logic } from "@/types";
  
  export default defineComponent({
    name: "LogicEditor",
    props: {
      logic: {
        type: Object as PropType<Logic>,
        required: true,
      },
    },
  });
  </script>
  
  <style scoped>
  .logic-editor {
    margin-top: 20px;
  }
  
  .logic-editor div {
    margin-bottom: 10px;
  }
  
  label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  input,
  select {
    padding: 5px;
    width: 100%;
    box-sizing: border-box;
  }
  </style>
  