import { mount } from "cypress/vue";
import type { DefineComponent } from "vue";

type MountParams = Parameters<typeof mount>;
type OptionsParam = MountParams[1];

declare global {
  namespace Cypress {
    interface Chainable {
      mount(component: DefineComponent<any, any, any>, options?: OptionsParam): Chainable<any>;
    }
  }
}

/**
 * Globale mount-Hilfsfunktion mit vordefinierten i18n-Mocks
 *
 * Alle Cypress-CT-Tests verwenden diesen Wrapper, der $t/$te/$i18n
 * automatisch bereitstellt. Individuelle Tests können die Mocks
 * über die options.global.mocks überschreiben.
 */
// Zwischen jedem Test 800 ms warten wenn slowMode aktiv (Demo-Tempo)
beforeEach(() => {
  if (Cypress.env("slowMode")) cy.wait(1600);
});

Cypress.Commands.add("mount", (component, options: OptionsParam = {}) => {
  const i18nMocks = {
    $t: (key: string) => key,
    $te: (_key: string) => true,
    $i18n: { locale: "en" },
  };

  const merged: OptionsParam = {
    ...options,
    global: {
      ...(options.global ?? {}),
      mocks: {
        ...i18nMocks,
        ...(options.global?.mocks ?? {}),
      },
    },
  };

  return mount(component, merged);
});
