import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import bootstrapPlugin from '@fullcalendar/bootstrap';
import * as ICAL from 'ical.js'
import { DateTime } from "luxon";

function to_JSDate(date) {
    return new Date(date.toUnixTime() * 1000).toISOString();
}

function build_event(vevent) {
  event = new ICAL.Event(vevent); 
  var start = to_JSDate(event.startDate);
  var end = (event.endDate ? to_JSDate(event.endDate) : null);

  if (event.isRecurring) {
    let recur_rules = event.iterator().toJSON().ruleIterators[0].rule;
    let iterator = event.iterator();

    let recurrances = [];
    let i = 0;
    for (i = 0; i < 12; i++) {
        if (i === 12) { break; }
        let next = iterator.next();
        let occurance = event.getOccurrenceDetails(next);
        let e = {
            title: event.summary,
            start: to_JSDate(occurance.startDate),
            end: (occurance.endDate ? to_JSDate(occurance.endDate) : null),
            description: event.description,
            location: event.location,
            allDay: false
        }
        recurrances.push(e);
    }
    return recurrances;
  } else { 
    return {
        title: event.summary,
        start: start,
        end: end,
        description: event.description,
        location: event.location
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');

    if (calendarEl != null) { 
        let defaultView = calendarEl.getAttribute("data-calendar-type") || "dayGridMonth";

        let ics_url = calendarEl.getAttribute("data-calendar-ics-url");
        let events = [
            { 
                events: function(fetchInfo, successCallback, failureCallback) { 
                        let xhr = new XMLHttpRequest();
                        xhr.open('GET', ics_url, true);   
                        xhr.onload = function () {
                            let iCalFeed = ICAL.parse(xhr.responseText);
                            let iCalComponent = new ICAL.Component(iCalFeed);
                            let vtimezones = iCalComponent.getAllSubcomponents("vtimezone");
                            vtimezones.forEach(function (vtimezone) {
                            if (!(ICAL.TimezoneService.has(
                                vtimezone.getFirstPropertyValue("tzid")))) {
                                ICAL.TimezoneService.register(vtimezone);
                            }
                            });

                            let ical_events = iCalComponent.getAllSubcomponents('vevent');
                            successCallback(ical_events.flatMap(build_event).flat()); 
                        }
                        xhr.send();
                }}];

        let navLinks;

        if (calendarEl.getAttribute("data-calendar-header") === "true") { 
            navLinks = true;
        } else { 
            navLinks = false;
        }


        let calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, bootstrapPlugin],
            navLinks: navLinks,
            themeSystem: 'bootstrap',
            timeZone: "local",
            headerToolbar: { 
                    start: '',
                    center: 'title'
            },
            visibleRange: function(currentDate) {
                let startDate = new Date(currentDate.valueOf());
                let endDate = new Date(currentDate.valueOf());
                startDate.setDate(startDate.getDate() - 1); // One day in the past
                endDate.setDate(endDate.getDate() + 90); // 3 monts roughly into the future
                return { start: startDate, end: endDate };
            },
            displayEventTime: true,
            displayEventEnd: true,
            firstDay: 1,
            weekNumbers: false,
            selectable: false,
            weekNumberCalculation: "ISO",
            eventLimit: true,
            slotLabelFormat: 'HH:mm',
            weekends: true,
            nowIndicator: true,
            dayPopoverFormat: 'dddd DD/MM',
            eventSources: events,
            eventClick: function (info) {
               let event = info.event; 
               let dtstart = DateTime.fromJSDate(event.start); 
               let dtend =  DateTime.fromJSDate(event.end);
                $('.modal').find('.title').text(event.title);
                $('.modal').find('.starts-at').text(dtstart.toLocaleString(DateTime.DATETIME_FULL));
                $('.modal').find('.ends-at').text(dtend.toLocaleString(DateTime.DATETIME_FULL));
                if (event.description) { 
                    $('.modal').find('.description').text(event.description);
                } else {
                    $('.modal').find('.description-label').hide();
                }
                if (event.extendedProps.location) { 
                    $('.modal').find('.location').text(event.extendedProps.location);
                } else {
                    $('.modal').find('.location-label').hide();
                }
 
                $('.modal').modal('show');
            }
        });

        calendar.render();
    }
});
