#!/usr/bin/env bash

reset-all-tdb() {
    psql -h tutorialdb.c856obael8lq.us-west-2.rds.amazonaws.com -U supertdbwab tdb_ticketing_3mcypfdswc5jvcen6cus18 -f src/wab/server/tutorialdb/ticketing/ticketing.sql
    psql -h tutorialdb.c856obael8lq.us-west-2.rds.amazonaws.com -U supertdbwab tdb_forum_3hhp8puv1ypnkypxcuctix -f src/wab/server/tutorialdb/forum/forum.sql
    psql -h tutorialdb.c856obael8lq.us-west-2.rds.amazonaws.com -U supertdbwab tdb_feedback_onptwusquvyp1yvfd1ivd2 -f src/wab/server/tutorialdb/feedback/feedback.sql
    psql -h tutorialdb.c856obael8lq.us-west-2.rds.amazonaws.com -U supertdbwab tdb_todomvc_ocfpfplub7rur2szdjntqh -f src/wab/server/tutorialdb/todomvc/todomvc.sql
    psql -h tutorialdb.c856obael8lq.us-west-2.rds.amazonaws.com -U supertdbwab tdb_timelog_obipfk5hbtg8br68sxeqga -f src/wab/server/tutorialdb/timelog/timelog.sql
    psql -h tutorialdb.c856obael8lq.us-west-2.rds.amazonaws.com -U supertdbwab tdb_ats_h443qaean3na7fprhkcxqn -f src/wab/server/tutorialdb/ats/ats.sql
}

reset-all-tdb