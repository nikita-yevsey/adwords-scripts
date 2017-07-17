function holdPositions () {
/*************************************************************** 
Bidding on Campaign and Keyword Labels 
Version 1.2.6
ChangeLog v1.2.6 - Еще одна адаптация - приведены типы переменных
ChangeLog v1.2.5 - Адаптирован под обновление API
-Можно задавать максимально низкую позицию для ярлыков параметром LOWEST_POSITION.
-Добавлено автоматическое создание всех ярлыков.
-Теперь нельзя задавать разные цвета для ярлыков разных позиций.
ChangeLog v1.2.4
-Исправлен баг с MIN_BID.
-Добавлено логгирование хода выполнения скрипта.
-Отключено отображение этих логов по умолчанию, добавлена настройка EXTRA_LOGS.
ChangeLog v1.2.3 
- Добавлены RUSH_BID коэффициенты.
- Добавлена проверка возможного уменьшения ставок для достижения первой позиции.
ChangeLog v1.2.2 - Добавлены стратегии для всех 1.0 - 3.2 позиций.
ChangeLog v1.2.1 - Исправлен вопрос с несуществующим ярлыком ключевых слов.
ChangeLog v1.2 - Добавлены ярлыки ключевых слов.
ChangeLog v1.1.1 - Добавлено итерирование стратегий.
ChangeLog v1.1 - Добавлено создание несуществующих ярлыков.
Никита Евсей
Eting Mark Agency
etingmark.by
Под лицензией GPLv3 http://s.40-02.ru/1DHW9dz
*****************************************************************/

var RUSH_BID = 1; // Задаем интенсивность, с которой меняются ставки как в большую, так и в меньшую сторону. Чем больше число, тем агрессивнее меняются ставки.
var RUSH_BID_INCREASING = 1; // Увеличивать ставки более агрессивно. Больше расходы, но быстрее достигаются желаемые позиции, потом медленно опускаются расходы. 
var RUSH_BID_DECREASING = 1; // Уменьшать ставки более агрессивно. Меньше расходы, но медленнее достигаются желаемые позиции, потом медленно растут расходы.

var DATE_RANGE = "LAST_7_DAYS"; // За какой период брать статистику. TODAY, YESTERDAY, LAST_7_DAYS, THIS_WEEK_SUN_TODAY, LAST_WEEK, LAST_14_DAYS, LAST_30_DAYS, LAST_BUSINESS_WEEK, LAST_WEEK_SUN_SAT, THIS_MONTH, LAST_MONTH, ALL_TIME

var MAX_BID = 2; // Максимальная ставка
var MIN_BID = 0.03; // Минимальная ставка. Если 0 - установит ставку для группы по умолчанию для тех ключевиков, ставки которых опустятся до нуля.

var BID_FROM_1_SPOT = 1.04; // На сколько опускать ставки, когда достигнуто 1 место при целевой позиции 1 место. Опускает ставки и проверяет, можно ли достигнуть 1 место, платя меньше. Если позиция опустится, скрипт опять вернет ее на место позже.

var EXTRA_LOGS = false; // Показывать ли инфо сообщения. Полезно при отладке
var EXTRA_LOGS_FOR_BIDS = true; // Показывать ли инфо сообщения о значениях изменяемых ставок, средних позиций и т.п. Полезно при отладке

var BID_CHANGE_COEFFICIENT_5 = 1.05; // Коэффициенты изменения ставок.
var BID_CHANGE_COEFFICIENT_10 = 1.1;
var BID_CHANGE_COEFFICIENT_15 = 1.15;
var BID_CHANGE_COEFFICIENT_30 = 1.3;
var BID_CHANGE_COEFFICIENT_50 = 1.5;

var LOWEST_POSITION = 6; // Максимально низкая позиция для ярлыков. Скрипт создаст ярлыки от 1.0 до указанной цифры.

		
this.main = function() {
Logger.log('Привет, меня зовут Емеля. Сейчас я буду изменять ставки для ключевых слов в зависимости от того, какие ярлыки для позиций вы им присвоили.');
Logger.log('Если вы выполняете скрипт в первый раз, то для начала я создам ярлыки для стратегий. После этого примените нужные ярлыки к кампаниям и ключевым словам, которые хотите мне доверить и запустите скрипт еще раз.');
Logger.log('');
var spotLabel  = []; // Массив для ярлыков целевых позиций
var spotsArray = []; // Массив для значений целевых позиций
var i = 0;
var j = 1;
while (i/10 + 1 <= LOWEST_POSITION.toFixed(1)){ //Создаем ярлыки от "1.0 место" до "X.Y место", где X.Y - LOWEST_POSITION
	spotLabel[i] = j.toFixed(1)+' место';  
	spotsArray[i] = j.toFixed(1); 
	j = j + 0.1;
	i++;
}
var SPOT_LABELS_STRING = "'"+spotLabel.join("','")+"'";          // Строка, содержащая все названия ярлыков. 
info("SPOT_LABELS_STRING = "+SPOT_LABELS_STRING);

var i = 0; 
info('Начал проверять наличие ярлыков в аккаунте и создавать, если нету.');
while (i/10 + 1 <= LOWEST_POSITION.toFixed(1)){
	createLabelIfNeeded(spotLabel[i],"#000000"); //Вызываем функцию и создаем ярлыки, если их нет в аккаунте. Цвет ярлыков стратегий задается здесь.
	i++;
}
info('Закончил проверку, создал ярлыки, если их не было');  
  
var i = 0; 
while (i/10 + 1 <= LOWEST_POSITION.toFixed(1)) { // Цикл, чтобы перебрать все стратегии и потом получить камппании которые имеют ярлык позиции 
	info('Начал получать кампании с ярлыками для стратегии: '+spotsArray[i]);
	var campaignsToBid = AdWordsApp.campaigns() //Получаем кампании, у которых есть ярлык стратегии i
	.withCondition("LabelNames CONTAINS_ALL ['"+spotsArray[i]+" место']")
	.withCondition("Status = ENABLED")
	.get();
	info('Закончил получать кампании с ярлыками для стратегии: '+spotsArray[i]);
	
	while (campaignsToBid.hasNext()) {	// Цикл для получения ключевиков данной кампании данной стратегии
		var spotToGet = spotsArray[i]; //Задаем позицию из массива
		var campaign = campaignsToBid.next();
		
		info('Начал получать ключевые слова без ярлыков в кампании:nn '+campaign);
		var keywordsToChangeBid = campaign.keywords() 	//Получаем ключевики без ярлыков
			.withCondition("Status = ENABLED")
			.withCondition("Impressions > 0")	
			.withCondition("LabelNames CONTAINS_NONE ["+SPOT_LABELS_STRING+"]")
			.orderBy("AveragePosition ASC")
			.forDateRange(DATE_RANGE)
			.get();	
		info('Закончил получать ключевые слова без ярлыков в кампании:'+campaign);
		
		info('Начал изменять ставки для ключевых слов без ярлыков в кампании:    '+campaign);
		ChangeBids(spotToGet); //Вызываем функцию менять ставки
		info('Закончил изменять ставки для ключевых слов без ярлыков в кампании: '+campaign);
	}
	i++;
}
  
var i = 0; 
while (i/10 + 1 <= LOWEST_POSITION.toFixed(1)) { // Цикл, чтобы перебрать все стратегии и потом получить все камппании
	info('Начал получать все кампании для стратегии: '+spotsArray[i]);
	var campaignsToBid = AdWordsApp.campaigns() //Получаем все кампании
	.withCondition("Status = ENABLED")
	.get();
	info('Закончил получать все кампании для стратегии: '+spotsArray[i]);
	
	while (campaignsToBid.hasNext()) {	// Цикл для получения ключевиков данной кампании данной стратегии
		var spotToGet = spotsArray[i]; //Задаем позицию из массива
		var campaign = campaignsToBid.next();
		
		info('Начал получать ключевые слова с ярлыками в кампании:   '+campaign); // Получаем кампании ключевые слова с ярлыками
		var keywordsToChangeBid = campaign.keywords() 	//Getting keywords with labels
			.withCondition("Status = ENABLED")
			.withCondition("Impressions > 0")
			.withCondition("LabelNames CONTAINS_ALL ['"+spotsArray[i]+" место']")
			.orderBy("AveragePosition ASC")
			.forDateRange(DATE_RANGE)
			.get();	
		info('Закончил получать ключевые слова с ярлыками в кампании:'+campaign);	
		
		info('Начал изменять ставки для ключевых слов с ярлыками в кампании:    '+campaign);		
		ChangeBids(spotToGet); //Вызываем функцию менять ставки
		info('Закончил изменять ставки для ключевых слов с ярлыками в кампании: '+campaign);	
	}
	i++;
}  
 
// Вся магия осуществляется здесь. 
function ChangeBids(targetPosition){ 	
	while (keywordsToChangeBid.hasNext()) {
		var keyword = keywordsToChangeBid.next();
		if (keyword.getStatsFor(DATE_RANGE).getAveragePosition() > parseFloat(targetPosition) + 3.0 && (keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_50 * RUSH_BID * RUSH_BID_INCREASING) + 0.01 < MAX_BID){ 
				keyword.setMaxCpc(parseFloat(keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_50 * RUSH_BID * RUSH_BID_INCREASING) + 0.01);
				    infoBids('Средняя позиция '+keyword.getStatsFor(DATE_RANGE).getAveragePosition());
					infoBids('Целевая стратегия '+parseFloat(targetPosition));
					infoBids('Насколько недобрали '+(keyword.getStatsFor(DATE_RANGE).getAveragePosition() - parseFloat(targetPosition)));
					infoBids('Условие '+(parseFloat(targetPosition) + 3.0));
					infoBids('Прошлая ставка '+keyword.getMaxCpc());
					infoBids('Новая ставка '+(parseFloat(keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_50 * RUSH_BID * RUSH_BID_INCREASING) + 0.01));				
			}
			else if (keyword.getStatsFor(DATE_RANGE).getAveragePosition() > parseFloat(targetPosition) + 1.5 && keyword.getStatsFor(DATE_RANGE).getAveragePosition() < parseFloat(targetPosition) + 3.1 && (keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_30 * RUSH_BID * RUSH_BID_INCREASING) + 0.01 < MAX_BID){
				keyword.setMaxCpc(parseFloat(keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_30 * RUSH_BID * RUSH_BID_INCREASING) + 0.01);
				    infoBids('Средняя позиция '+keyword.getStatsFor(DATE_RANGE).getAveragePosition());
					infoBids('Целевая стратегия '+parseFloat(targetPosition));
					infoBids('Насколько недобрали '+(keyword.getStatsFor(DATE_RANGE).getAveragePosition() - parseFloat(targetPosition)));
					infoBids('Условие '+(parseFloat(targetPosition) + 1.5));
					infoBids('Прошлая ставка '+keyword.getMaxCpc());
					infoBids('Новая ставка '+(parseFloat(keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_30 * RUSH_BID * RUSH_BID_INCREASING) + 0.01));				
			}
			else if (keyword.getStatsFor(DATE_RANGE).getAveragePosition() > parseFloat(targetPosition) + 0.5 && keyword.getStatsFor(DATE_RANGE).getAveragePosition() < parseFloat(targetPosition) + 1.6 && (keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_15 * RUSH_BID * RUSH_BID_INCREASING) + 0.01 < MAX_BID){ 
				keyword.setMaxCpc(parseFloat(keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_15 * RUSH_BID * RUSH_BID_INCREASING) + 0.01);
				    infoBids('Средняя позиция '+keyword.getStatsFor(DATE_RANGE).getAveragePosition());
					infoBids('Целевая стратегия '+parseFloat(targetPosition));
					infoBids('Насколько недобрали '+(keyword.getStatsFor(DATE_RANGE).getAveragePosition() - parseFloat(targetPosition)));
					infoBids('Условие '+(parseFloat(targetPosition) + 0.5));
					infoBids('Прошлая ставка '+keyword.getMaxCpc());
					infoBids('Новая ставка '+(parseFloat(keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_15 * RUSH_BID * RUSH_BID_INCREASING) + 0.01));				
			}
			else if (keyword.getStatsFor(DATE_RANGE).getAveragePosition() > parseFloat(targetPosition) + 0.3 && keyword.getStatsFor(DATE_RANGE).getAveragePosition() < parseFloat(targetPosition) + 0.6 && (keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_10 * RUSH_BID * RUSH_BID_INCREASING) + 0.01 < MAX_BID){
				keyword.setMaxCpc(parseFloat(keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_10 * RUSH_BID * RUSH_BID_INCREASING) + 0.01);
				    infoBids('Средняя позиция '+keyword.getStatsFor(DATE_RANGE).getAveragePosition());
					infoBids('Целевая стратегия '+parseFloat(targetPosition));
					infoBids('Насколько недобрали '+(keyword.getStatsFor(DATE_RANGE).getAveragePosition() - parseFloat(targetPosition)));
					infoBids('Условие '+(parseFloat(targetPosition) + 0.3));
					infoBids('Прошлая ставка '+keyword.getMaxCpc());
					infoBids('Новая ставка '+(parseFloat(keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_10 * RUSH_BID * RUSH_BID_INCREASING) + 0.01));				
			}
			else if (keyword.getStatsFor(DATE_RANGE).getAveragePosition() > parseFloat(targetPosition) + 0.1 && keyword.getStatsFor(DATE_RANGE).getAveragePosition() < parseFloat(targetPosition) + 0.4 && (keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_5 * RUSH_BID * RUSH_BID_INCREASING) + 0.01 < MAX_BID){
				keyword.setMaxCpc(parseFloat(keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_5 * RUSH_BID * RUSH_BID_INCREASING) + 0.01);
				    infoBids('Средняя позиция '+keyword.getStatsFor(DATE_RANGE).getAveragePosition());
					infoBids('Целевая стратегия '+parseFloat(targetPosition));
					infoBids('Насколько недобрали '+(keyword.getStatsFor(DATE_RANGE).getAveragePosition() - parseFloat(targetPosition)));
					infoBids('Условие '+(parseFloat(targetPosition) + 0.1));
					infoBids('Прошлая ставка '+keyword.getMaxCpc());
					infoBids('Новая ставка '+(parseFloat(keyword.getMaxCpc() * BID_CHANGE_COEFFICIENT_5 * RUSH_BID * RUSH_BID_INCREASING) + 0.01));				
			}
			else if (keyword.getStatsFor(DATE_RANGE).getAveragePosition() > parseFloat(targetPosition) - 0.2 && keyword.getStatsFor(DATE_RANGE).getAveragePosition() < parseFloat(targetPosition) + 0.2 ){
			}
			else if (keyword.getStatsFor(DATE_RANGE).getAveragePosition() > parseFloat(targetPosition) - 0.3 && keyword.getStatsFor(DATE_RANGE).getAveragePosition() < parseFloat(targetPosition) - 0.1 && (keyword.getMaxCpc() / BID_CHANGE_COEFFICIENT_5 / RUSH_BID / RUSH_BID_DECREASING) - 0.01 > MIN_BID){
				keyword.setMaxCpc(parseFloat(keyword.getMaxCpc() / BID_CHANGE_COEFFICIENT_5 / RUSH_BID / RUSH_BID_DECREASING) - 0.01);
					infoBids('Средняя позиция '+keyword.getStatsFor(DATE_RANGE).getAveragePosition());
					infoBids('Целевая стратегия '+parseFloat(targetPosition));
					infoBids('Насколько перебрали '+(parseFloat(targetPosition) - keyword.getStatsFor(DATE_RANGE).getAveragePosition()));
					infoBids('Условие '+(targetPositionCheck = parseFloat(targetPosition) - 0.3));
					infoBids('Прошлая ставка '+keyword.getMaxCpc());
					infoBids('Новая ставка ' +(parseFloat(keyword.getMaxCpc() / BID_CHANGE_COEFFICIENT_5 / RUSH_BID / RUSH_BID_DECREASING) - 0.01));		
			}
			else if (keyword.getStatsFor(DATE_RANGE).getAveragePosition() > parseFloat(targetPosition) - 0.5 && keyword.getStatsFor(DATE_RANGE).getAveragePosition() < parseFloat(targetPosition) - 0.2 && (keyword.getMaxCpc() / BID_CHANGE_COEFFICIENT_10 / RUSH_BID / RUSH_BID_DECREASING) - 0.01 > MIN_BID){
				keyword.setMaxCpc(parseFloat(keyword.getMaxCpc() / BID_CHANGE_COEFFICIENT_10 / RUSH_BID / RUSH_BID_DECREASING) - 0.01);
				    infoBids('Средняя позиция '+keyword.getStatsFor(DATE_RANGE).getAveragePosition());
					infoBids('Целевая стратегия '+parseFloat(targetPosition));
					infoBids('Насколько перебрали '+(parseFloat(targetPosition) - keyword.getStatsFor(DATE_RANGE).getAveragePosition()));
					infoBids('Условие '+(targetPositionCheck = parseFloat(targetPosition) - 0.5));
					infoBids('Прошлая ставка '+keyword.getMaxCpc());
					infoBids('Новая ставка '+ (parseFloat(keyword.getMaxCpc() / BID_CHANGE_COEFFICIENT_10 / RUSH_BID / RUSH_BID_DECREASING) - 0.01));				
			}
			else if ((keyword.getMaxCpc() / BID_CHANGE_COEFFICIENT_15 / RUSH_BID / RUSH_BID_DECREASING) - 0.01 > MIN_BID){
				keyword.setMaxCpc((keyword.getMaxCpc() / BID_CHANGE_COEFFICIENT_15 / RUSH_BID / RUSH_BID_DECREASING) - 0.01);				
			}
			else{}		
			
		//Если ключевик уже на первом месте, и это и есть цель, попробуем немного понизить ставки. чтобы платить меньше, оставаясь на первом месте. 
		if (keyword.getStatsFor(DATE_RANGE).getAveragePosition() == 1 && targetPosition == 1 && keyword.getMaxCpc() / BID_FROM_1_SPOT - 0.01 > MIN_BID){
			keyword.setMaxCpc(keyword.getMaxCpc() / BID_FROM_1_SPOT - 0.01);
		}
		
	}	
}	


// Вспомогательная функция - создаем ярлык, если его нет в аккаунте
function createLabelIfNeeded(name,color) { 
  if(!AdWordsApp.labels().withCondition("Name = '"+name+"'").get().hasNext()) {  
    AdWordsApp.createLabel(name,"",color);
	info('Создал ярлык "'+name+'"');
  } else {
  }
}



// Вспомогательная функция для вывода логов о ходе работы
function info(msg) {
  if(EXTRA_LOGS) {
    Logger.log('Инфо: '+msg);
  }
}
	
// Вспомогательная функция для вывода логов о значениях ставок
function infoBids(msg) {
  if(EXTRA_LOGS_FOR_BIDS) {
    Logger.log('Инфо: '+msg);
  }
}	
	
}
