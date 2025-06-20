const { createApp, onMounted, ref, computed } = Vue;

import { allMarkers } from '/js/data.js';

const app = createApp({
  setup() {
    const mapContainer = ref(null);
    const mapMmarker = ref(allMarkers.dumps);
    const activeTab = ref('dumps');
    const isLoading = ref(true); // Добавляем состояние загрузки
    let map = null;
    let clusterer = null;
    const showPopup = ref(false);
    const activeMarkerInfo = ref({});
    const activeCklasrerInfo = ref({});

    // Вычисляемое свойство для информации о маркерах
    const markersInfo = computed(() => {
      return mapMmarker.value.map(marker => ({
        title: marker.properties.hintContent,
        details: marker.properties.balloonContent,
        ...marker.properties
      }));
    });

    // Инициализация карты
    onMounted(() => {
      if (typeof ymaps !== 'undefined') {
        initMap();
      } else {
        window.addEventListener('load', initMap);
      }
    });

    function initMap() {
      ymaps.ready(() => {
        map = new ymaps.Map(mapContainer.value, {
          center: [47.222109, 39.718813],
          zoom: 9
        });
        initClusterer();
        updateMarkers();
      });
    }

    function initClusterer() {
      clusterer = new ymaps.Clusterer({
        clusterDisableClickZoom: true,
        clusterOpenBalloonOnClick: false,
        clusterIconLayout: 'default#pieChart',
        clusterIconPieChartRadius: 25,
        clusterIconPieChartCoreRadius: 15,
        clusterIconPieChartStrokeWidth: 2,
        clusterBalloonContentLayout: 'cluster#balloonCarousel',
        clusterBalloonItemContentLayout: 'my#customLayout',
        clusterBalloonPanelMaxMapArea: 0,
      });

      map.geoObjects.add(clusterer);

      clusterer.events.add('click', (e) => { // Используем стрелочную функцию для сохранения контекста
        const target = e.get('target');

        if (target instanceof ymaps.Placemark) {
          const properties = target.properties.getAll();
          activeMarkerInfo.value = {
            hintContent: properties.hintContent || 'Метка на карте',
            balloonContent: properties.balloonContent || '',
            address: properties.address || 'не указан',
            area: properties.area || '',
            type: properties.type || '',
            clusterSize: null
          };
          showPopup.value = true;
        } else {
            const geoObjects = target.getGeoObjects();

              const statusTextMaps = {
                dumps: {
                  removed: 'Свалочный очаг ликвидирован',
                  active: 'Активный свалочный очаг',
                  atWork: 'Идет ликвидация свалочного очага'
                },
                polygons: {
                  removed: 'Полигон закрыт',
                  active: 'Полигон работает',
                  atWork: 'Полигон временно не работает'
                },
                receptions: {
                  removed: 'Пункт закрыт',
                  active: 'Пункт работает',
                  atWork: 'Пункт временно не работает'
                }
              };
            
            // Собираем HTML-контент для всех меток
            let clusterContent = '<div class="cluster-content">';
            geoObjects.forEach((element, index) => {
              const props = element.properties.getAll();
              
              // Получаем нужный набор статусов в зависимости от активной вкладки
              const currentStatusMap = statusTextMaps[activeTab.value] || {};
              const propsStatus = currentStatusMap[props.status] || 'Неизвестный статус';
              
              // Базовые поля для всех типов
              let markerContent = `
                <div class="cluster-marker">
                  <h4>${props.hintContent || `Метка ${index + 1}`}</h4>
                  <p>${props.balloonContent || ''}</p>
                  <p><strong>Адрес:</strong> ${props.address || 'не указан'}</p>
              `;
              
              // Добавляем специфичные поля в зависимости от типа
              if (activeTab.value === 'dumps') {
                markerContent += `
                  ${props.area ? `<p><strong>Площадь:</strong> ${props.area}</p>` : ''}
                  ${props.type ? `<p><strong>Тип отходов:</strong> ${props.type}</p>` : ''}
                `;
              } else if (activeTab.value === 'polygons') {
                markerContent += `
                  ${props.capacity ? `<p><strong>Мощность:</strong> ${props.capacity}</p>` : ''}
                  ${props.license ? `<p><strong>Лицензия:</strong> ${props.license}</p>` : ''}
                `;
              } else if (activeTab.value === 'receptions') {
                markerContent += `
                  ${props.materials ? `<p><strong>Принимаемые материалы:</strong> ${props.materials}</p>` : ''}
                  ${props.schedule ? `<p><strong>Режим работы:</strong> ${props.schedule}</p>` : ''}
                `;
              }
              
              // Добавляем статус и закрываем блок
              markerContent += `
                  <p><strong>Статус:</strong> ${propsStatus}</p>
                </div>
                ${index < geoObjects.length - 1 ? '<hr>' : ''}
              `;
              
              clusterContent += markerContent;
            });

            clusterContent += '</div>';
            
            activeMarkerInfo.value = {
              hintContent: `Свалочные очаги`,
              balloonContent: clusterContent,
              clusterSize: geoObjects.length,
              isCluster: true // Флаг, что это кластер
            };
            
          showPopup.value = true;
        }
      });
    }

    const closePopup = () => {
      showPopup.value = false;
    };


    function updateMarkers() {
      if (!clusterer) return;
      clusterer.removeAll();
      
      const statusColors = {
        active: '#FF0000',
        atWork: '#ff7c53',
        removed: '#00AA00'
      };

      const markers = mapMmarker.value.map(marker => {
        const placemark = new ymaps.Placemark(
          marker.coords,
          marker.properties, 
          {
            preset: 'islands#' + marker.properties.status + 'Icon',
            iconColor: statusColors[marker.properties.status] || '#AAAAAA',
            balloonCloseButton: false,
            hasBalloon: false
          }
        );
        
        return placemark;
      });

      clusterer.add(markers);
    }
    
    // Методы для переключения маркеров
    function showDumps() {
      mapMmarker.value = allMarkers.dumps;
      activeTab.value = 'dumps';
      updateMarkers();
    }

    function showPolygons() {
      mapMmarker.value = allMarkers.polygons;
      activeTab.value = 'polygons';
      updateMarkers();
    }

    function showReceptions() {
      mapMmarker.value = allMarkers.receptions;
      activeTab.value = 'receptions';
      updateMarkers();
    }

    // Скрываем прелоадер после полной загрузки
    setTimeout(() => {
      isLoading.value = false; // Скрываем прелоадер после загрузки карты
    }, 800);

    return {
      mapContainer,
      mapMmarker,
      activeTab,
      markersInfo,
      isLoading,
      showPopup,
      activeMarkerInfo,
      activeCklasrerInfo,
      showDumps,
      showPolygons,
      showReceptions,
      closePopup
    };
  }
});

app.mount('#app');