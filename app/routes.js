// These are the pages you can go to.
// They are all wrapped in the App component, which should contain the navbar etc
// See http://blog.mxstbr.com/2016/01/react-apps-with-pages for more information
// about the code splitting business
// import { getHooks } from './utils/hooks';

const errorLoading = err => {
  console.error('Dynamic page loading failed', err); // eslint-disable-line no-console
};

const loadModule = cb => componentModule => {
  cb(null, componentModule.default);
};

export default function createRoutes() {
  // store) {
  // create reusable async injectors using getHooks factory
  // const { injectReducer, injectSagas } = getHooks(store);

  return [
    {
      path: '/',
      name: 'login',
      getComponent(nextState, cb) {
        const importModules = Promise.all([
          System.import('containers/HomePage'),
        ]);
        const renderRoute = loadModule(cb);
        importModules.then(([component]) => {
          renderRoute(component);
        });
        importModules.catch(errorLoading);
      },
    },
    {
      path: '/tutorial',
      name: 'tutorialPage',
      getComponent(nextState, cb) {
        System.import('containers/TutorialPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/library',
      name: 'libraryPage',
      getComponent(nextState, cb) {
        System.import('containers/LibraryPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/store',
      name: 'SalePage',
      getComponent(nextState, cb) {
        System.import('containers/SalePage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/store/:sceneId',
      name: 'ProductPage',
      getComponent(nextState, cb) {
        System.import('containers/ProductPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/world/store',
      name: 'WorldStorePage',
      getComponent(nextState, cb) {
        System.import('containers/ScenesPage/WorldStorePage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/templates',
      name: 'templatePage',
      getComponent(nextState, cb) {
        System.import('containers/TemplatePage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/stations/new/:sceneId',
      name: 'newScene',
      getComponent(nextState, cb) {
        System.import('containers/ScenesPage/NewScenePage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/station/:sceneId/builder',
      name: 'editorPage',
      getComponent(nextState, cb) {
        System.import('containers/ScenesPage/EditorPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/editor/:sceneId',
      name: 'publicEditor',
      getComponent(nextState, cb) {
        System.import('containers/ScenesPage/PublicEditor')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/station/:sceneId/VR',
      name: 'vrPage',
      getComponent(nextState, cb) {
        System.import('containers/ScenesPage/VRPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/station/:sceneId/settings',
      name: 'stationSettings',
      getComponent(nextState, cb) {
        System.import('containers/ScenesPage/SettingPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/station/:sceneId',
      name: 'viewPage',
      getComponent(nextState, cb) {
        System.import('containers/ScenesPage/ViewPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/station/world/:sceneId',
      name: 'viewPage',
      getComponent(nextState, cb) {
        System.import('containers/ScenesPage/WorldStationView')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/user/:userName',
      name: 'userPage',
      getComponent(nextState, cb) {
        System.import('containers/UserPage/UserHomePage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/user/world/:userName',
      name: 'userPage',
      getComponent(nextState, cb) {
        System.import('containers/WorldViewPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/users/login',
      name: 'UserLogin',
      getComponent(nextState, cb) {
        System.import('containers/UserPage/LoginPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/users/password_reset',
      name: 'PasswordReset',
      getComponent(nextState, cb) {
        System.import('containers/UserPage/ResetPasswordPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/users/new',
      name: 'UserRegister',
      getComponent(nextState, cb) {
        const importModules = Promise.all([
          System.import('containers/UserPage/SignUpPage'),
        ]);

        const renderRoute = loadModule(cb);

        importModules.then(([component]) => {
          renderRoute(component);
        });

        importModules.catch(errorLoading);
      },
    },
    {
      path: '/home/notifications',
      name: 'notifications',
      getComponent(nextState, cb) {
        System.import('containers/UserPage/NotificationsPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/home/balance',
      name: 'balance',
      getComponent(nextState, cb) {
        System.import('containers/BalancePage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    // {
    //   path: '/home/plan',
    //   name: 'balance',
    //   getComponent(nextState, cb) {
    //     System.import('containers/BalancePage/PlanPage')
    //       .then(loadModule(cb))
    //       .catch(errorLoading);
    //   },
    // },
    {
      path: '/home/:plan/checkout',
      name: 'balance',
      getComponent(nextState, cb) {
        System.import('containers/BalancePage/CheckoutPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },

    {
      path: '/home/:plan/vitpayment',
      name: 'balance',
      getComponent(nextState, cb) {
        System.import('containers/BalancePage/VitpaymentPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },

    {
      path: '/home/inventory',
      name: 'InventoryPage',
      getComponent(nextState, cb) {
        System.import('containers/InventoryPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/home/settings/email',
      name: 'email',
      getComponent(nextState, cb) {
        System.import('containers/UserPage/UserSettingPage/EmailSettingPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/home/settings/password',
      name: 'password',
      getComponent(nextState, cb) {
        System.import('containers/UserPage/UserSettingPage/PasswordSettingPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '/test',
      name: 'testPage',
      getComponent(nextState, cb) {
        System.import('containers/TestPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
    {
      path: '*',
      name: 'notfound',
      getComponent(nextState, cb) {
        System.import('containers/NotFoundPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
  ];
}
