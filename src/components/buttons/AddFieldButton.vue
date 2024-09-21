<template>
  <div class="add-field-section w-full">
    <div class="relative">
      <!-- Main Button Group Container -->
      <div class="bg-white shadow-lg overflow-hidden flex items-center space-x-2 rounded-full" :style="{
        width: isDropdown ? (isExpanded ? 'auto' : '3rem') : 'auto',
        height: isDropdown ? (isExpanded ? 'auto' : '3rem') : 'auto',
      }">
        <!-- PlusIcon as part of button group -->
        <button
          class="flex items-center justify-center w-14 h-14 text-white bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          @click="toggleExpand" :aria-label="isExpanded ? 'Collapse category menu' : 'Expand category menu'
            " :class="{
                          'rounded-full': isDropdown,
                          'rounded-l-full rounded-r-none': !isDropdown,
                        }">
          <PlusIcon class="w-6 h-6" />
        </button>

        <!-- Dropdown Menu (for smaller screens) -->
        <Transition enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-200 ease-in" leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0">
          <div v-if="isExpanded && isDropdown"
            class="absolute left-16 top-0 bg-white rounded-2xl shadow-lg overflow-hidden">
            <div class="py-2 px-1">
              <button v-for="category in fieldCategories" :key="category.name"
                class="group flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-200 rounded-xl"
                :class="{
                  'bg-gray-200': props.selectedCategory === category.name,
                }" @click="selectCategory(category.name)">
                <span class="flex items-center justify-center w-8 h-8 mr-3 rounded-full" :class="category.color">
                  <PlusIcon
                    class="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </span>
                {{ category.label }}
                <CheckIcon v-if="props.selectedCategory === category.name" class="ml-2 w-4 h-4 text-green-500" />
              </button>
            </div>
          </div>
        </Transition> 

        <!-- Button Group for Larger Screens (Horizontal layout) -->
        <div v-if="!isDropdown" class="flex items-center space-x-0">
                <button v-for="(category, index) in fieldCategories" :key="category.name"
                  class="flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-white rounded-none hover:bg-gray-100 bg-opacity-15"
                  :class="category.color, {
                    'rounded-none': true,
                    'rounded-r-full': index === fieldCategories.length - 1
                  }" @click="selectCategory(category.name)">
                  {{ category.label }}
                </button>
              </div>
            </div>
      <Transition enter-active-class="transition duration-200 ease-out"
              enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-200 ease-in" leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0">
              <div v-if="selectedCategory"
                class="absolute left-16 top-14 z-50 bg-white rounded-lg shadow-lg w-64 max-w-full"
                :style="{ maxHeight: '50vh', overflowY: 'auto' }">
                <Command>
                  <CommandInput placeholder="Search field types..." />
                  <CommandList>
                    <CommandEmpty>No field types found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem v-for="type in selectedFieldTypes" :key="type" :value="type"
                        @click="addNewField(type)">
                        <span>{{ typeToLabelMap[type] }}</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { PlusIcon, CheckIcon } from "lucide-vue-next";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { FieldCategory, QuestionType, typeToLabelMap } from "@/types";

// Define props to accept external data like field categories, and event emitters to notify parent components
const props = defineProps<{
  selectedCategory: FieldCategory | null
}>();

const fieldCategories: {
  name: FieldCategory;
  color: string;
  label: string;
}[] = [
    { name: "choice", color: "bg-blue-400", label: "one choice" },
    { name: "choices", color: "bg-green-400", label: "multiple choice" },
    { name: "text", color: "bg-yellow-400", label: "text field" },
    { name: "file", color: "bg-purple-400", label: "file upload" },
    { name: "rating", color: "bg-red-400", label: "ratings" },
    { name: "switch", color: "bg-indigo-400", label: "yes/no" },
  ];

const emit = defineEmits(["toggleExpand", "selectCategory", "addField"]);

const isExpanded = ref(false);
const isDropdown = ref(false);



const fieldTypes: Record<FieldCategory, QuestionType[]> = {
  choice: ["radio", "select", "slider", "range"],
  choices: ["checkbox", "tags"],
  text: [
    "fname",
    "lname",
    "fullName",
    "short",
    "long",
    "email",
    "date",
    "time",
    "address",
    "phone",
    "website",
  ],
  file: ["file"],
  rating: ["rating"],
  switch: ["yesno"],
};

const selectedFieldTypes = computed(() => {
  if (props.selectedCategory) {
    const fTypes = fieldTypes[props.selectedCategory]
    if (fTypes.length == 1) {
      addNewField(fTypes[0]);
    }
    return fTypes;
  }
  return []
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  emit("toggleExpand", isExpanded.value);
};

const addNewField = (type: QuestionType) => {
  emit("addField", type);
};

const selectCategory = (category: string) => {
  emit("selectCategory", category);
};
</script>
