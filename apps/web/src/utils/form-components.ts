import { markRaw, type Component } from 'vue';

const components = new Map<string, Component>();
export function registerFormComponent(name: string, component: Component): void {
  if (components.has(name)) throw new Error(`Duplicate form component: ${name}`);
  components.set(name, markRaw(component));
}
export function getFormComponent(name: string): Component | undefined { return components.get(name); }
