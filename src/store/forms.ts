import { defineStore } from "pinia";
import axios from "axios";
import { AppForm, FormResponse, FormResponseData } from "@/types";
import { useAuthStore } from "./auth";

const API_BASE_URI =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const FORMS_ENDPOINT = `${API_BASE_URI}/app-forms`;

export const useFormStore = defineStore("forms", {
  state: () => ({
    allForms: [] as AppForm[],
    recentForms: [] as AppForm[],
    token: localStorage.getItem("venAuthToken") as string
  }),
  actions: {
    getToken() {
      if (!this.token) {
        const authStore = useAuthStore();
        const token = authStore.getToken();
        if (token) {
          this.token = token;
        }
      }
      return this.token   
    },

    async saveForm(form: AppForm, router?: any) {

      form.last_view_date = new Date();

      try {
        const response = await axios.post(FORMS_ENDPOINT, form, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
        });

        if (response.status === 200 || response.status === 201) {
          const updatedForm = {
            ...form,
            ...response.data.data,
            id: response.data.data.id
          };

          this.updateRecentForms(updatedForm);

          if (router && router.currentRoute.params?.id !== updatedForm.id) {
            router.replace(`/forms/${updatedForm.id}`);
          }

          return true;
        } else {
          console.error("Failed to save form:", response);
          return false;
        }
      } catch (error) {
        console.error("Error saving form to API:", error);
        return false;
      }
    },

    async deleteForm(id: string): Promise<boolean> {
      try {
        const response = await axios.delete(`${FORMS_ENDPOINT}/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
        });
    
        if (response.status === 200 || response.status === 204) {
          this.allForms = this.allForms.filter((file) => file.id !== id);
          this.recentForms = this.recentForms.filter((file) => file.id !== id);

          localStorage.setItem(
            "VENX_RECENT_FORMS",
            JSON.stringify(this.recentForms.map((file) => file.id))
          );
    
          return true;
        } else {
          console.error("Failed to delete form:", response);
          return false;
        }
      } catch (error) {
        console.error("Error deleting form:", error);
        return false;
      }
    },

    async fetchForms(page: number): Promise<AppForm[]> {
      try {
        const response = await axios.get(`${FORMS_ENDPOINT}?page=${page}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
        });
        const apiData = response.data?.data;
        const forms = apiData as AppForm[];
        this.allForms = forms;
        return this.allForms;
      } catch (error) {
        console.error("Error fetching forms from API:", error);
        return [];
      }
    },

    async fetchForm(id: string): Promise<AppForm|null> {
      try {
        const response = await axios.get(`${FORMS_ENDPOINT}/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
        });
        const apiData = response.data?.data;
        const form = apiData as AppForm;
        return form;
      } catch (error) {
        console.error("Error fetching forms from API:", error);
        return null;
      }
    },

    async fetchResponses(id: string): Promise<FormResponseData> {
        try {
          const response = await axios.get(`${FORMS_ENDPOINT}/${id}/responses`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.getToken()}`,
            },
          });
          
          const apiData = response.data as FormResponseData;
          
          // Process the responses to create a more usable structure
          const processedResponses = apiData.responses as FormResponse[]
  
          return {
            responses: processedResponses,
            meta: apiData.meta,
            statistics: apiData.statistics
          };
        } catch (error) {
          console.error("Error fetching responses from API:", error);
          throw error;
        }
      },
  

    updateRecentForms(form: AppForm) {
      const existingIndex = this.recentForms.findIndex((f) => f.id === form.id);
      if (existingIndex !== -1) {
        this.recentForms.splice(existingIndex, 1);
      }
      this.recentForms.unshift(form);
      this.recentForms = this.recentForms.slice(0, 10);

      localStorage.setItem(
        "VENX_RECENT_FORMS",
        JSON.stringify(this.recentForms.map((f) => f.id))
      );
    },
  },
});