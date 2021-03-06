<template>
  <div id="results_container" 
    v-on:click="next"
  >

    <div id="container_grid">
      <div id="header" class="font_shadow">{{ brand }}</div>

      <div id="container_result_overall"> 
        <div id="avatar_local"></div>
        <div id="avatar_local_name" class="avatar_name_styling font_shadow">{{ localName }}</div> 
        <div id="score_overall" class="font_shadow">{{ localScore }} - {{ remoteScore }}</div>
        <div id="avatar_remote"></div>
        <div id="avatar_remote_name" class="avatar_name_styling font_shadow">{{ remoteName }}</div> 
      </div>

      <div v-for="round in rounds" class="round_grid">
        <div class="round_number font_shadow">
          <div>{{ roundTitle }} {{ round.index + 1 }}</div>
        </div>
        <div class="round_result">
          <div class="round_result_avatar_1 round_result_avatar">
            <div class="question_result"
              v-bind:class="{
                correct: round.completed && round.results[0].localCorrect === true,
                wrong: round.completed && round.results[0].localCorrect === false
              }"
            ></div>
            <div class="question_result"
              v-bind:class="{
                correct: round.completed && round.results[1].localCorrect === true,
                wrong: round.completed && round.results[1].localCorrect === false
              }"
            ></div>
            <div class="question_result"
              v-bind:class="{
                correct: round.completed && round.results[2].localCorrect === true,
                wrong: round.completed && round.results[2].localCorrect === false
              }"
            ></div>
          </div>
        
          <div class="topic"
              v-bind:class="{
                hidden: !round.completed
              }"
          >{{ gameTitle }}</div>

          <div class="round_result_avatar_2 round_result_avatar">
            <div class="question_result"
              v-bind:class="{
                correct: round.completed && round.results[0].remoteCorrect === true,
                wrong: round.completed && round.results[0].remoteCorrect === false
              }"
            ></div>
            <div class="question_result"
              v-bind:class="{
                correct: round.completed && round.results[1].remoteCorrect === true,
                wrong: round.completed && round.results[1].remoteCorrect === false
              }"
            ></div>
            <div class="question_result"
              v-bind:class="{
                correct: round.completed && round.results[2].remoteCorrect === true,
                wrong: round.completed && round.results[2].remoteCorrect === false
              }"
            ></div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import * as Timeout from 'await-timeout'
import * as _ from 'lodash'

import Result from '../../../shared/Result'

interface Round {
  index: number,
  completed: boolean,
  results: Result[]
}

export default {
  props: {
    results: {
      type: Array,
      note: 'Results'
    }
  },
  data() {
    return {
      brand: 'Quizduell',
      gameTitle: 'Oma & Opa vs. Familie',
      roundTitle: 'Runde',
      localName: 'Oma & Opa',
      remoteName: 'Familie'
    }
  },
  computed: {
    localScore: function(): number {
      return _.filter(this.results, result => result && result.localCorrect === true).length
    },
    remoteScore: function(): number {
      return _.filter(this.results, result => result && result.remoteCorrect === true).length
    },
    rounds: function(): Round[] {
      const rounds: Round[] = []
      let roundIndex = 0
      for (let i = 2; i < this.results.length; i += 3) {
        const results0 = this.results[i - 2]
        const results1 = this.results[i - 1]
        const results2 = this.results[i]
        const completed = !!results0 && !!results1 && !!results2
        const round: Round = {
          index: roundIndex,
          completed,
          results: [
            results0,
            results1,
            results2
          ]
        }
        rounds.push(round)
        roundIndex += 1
      }
      console.log(rounds)
      return rounds
    }
  },
  methods: {
    next() {
      this.$emit('results-close')
    }
  }
}
</script>

<style lang="scss">

.font_shadow {
  text-shadow: 0.04em 0.04em #0f678f; 
}

#container_grid {
  display: grid;
  grid-template-rows: 1 1 1 1 1 1 1 1;
  grid-template-columns: 1 ; 
  grid-row-gap: 30px;
  grid-template-areas:  
    "header" 
    "result_overall" 
    "round_1" 
    "round_2" 
    "round_3"
    "round_4" 
    "round_5" 
    "round_6";
}

#header {
  grid-area: header;
  text-align: center;
  font-size: 40pt;
  margin-top: 35px;
  margin-bottom: 25px;
  font-weight: 700;
}

#container_result_overall {
  grid-area: result_overall;
  max-width: 100%;
  display: grid;
  grid-template-rows: 1 1;
  grid-template-columns: 37% 26% 37% ; 
  grid-template-areas:
    "column_1 column_2 column_3"
    "avatar_name_1 . avatar_name_2";
  align-items: center;
  justify-items: center;
  margin-bottom: 16px;
  margin-left: 40px;
  margin-right: 40px;
  font-weight: 700;
}

#container_round_1 {
  grid-area: round_1;
}

#container_round_2 {
  grid-area: round_2;
}

#container_round_3 {
  grid-area: round_3;
}

#container_round_4 {
  grid-area: round_4;
}

#container_round_5 {
  grid-area: round_5;
}

#container_round_6 {
  grid-area: round_6;
}


/* Child elements from container_result_overall */

#avatar_local {
  grid-area: column_1;
  width: 100px;
  height: 100px;
  background-image: url('../../assets/avatar_gisi.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

#avatar_local_name {
  grid-area: avatar_name_1;
  text-align: center;
}

#score_overall {
  grid-area: column_2;
  font-size: 50pt;
  text-align: center;
}

#avatar_remote {
  grid-area: column_3;
  width: 100px;
  height: 100px;
  background-image: url('../../assets/avatar_family.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

#avatar_remote_name {
  grid-area: avatar_name_2;
  text-align: center;
}

.avatar_name_styling {
  margin-top: 20px;
  font-size: 26pt;
}

/* Grid definition for each round result */

.round_grid {
  display: grid;
  grid-template-rows: 1  1;
  grid-template-columns: 1;
  grid-template-areas:
    "round_name"
    "round_result"; 
}

.round_number {
  grid-area: round_name;
  justify-self: self-center;
  align-self: end;
  text-align: center;
  text-transform: uppercase;
  font-size: 22px;
  font-weight: 300;
}

.round_number>div {
  margin-bottom: 10px;
}

.topic {
  text-align: center;
  margin-left: 20px;
  margin-right: 20px;
  font-size: 20px;
  font-weight: 300;
}

.topic.hidden {
  opacity: 0;
}

/* Styledefinition question result rectangle */

.question_result {
  background: transparent;
  width: 30px;
  height: 10px;
  border-radius: 4px;
  padding: 10px;
  margin: 2px; 
}

.question_result.correct {
  background: linear-gradient(to bottom, #88d03c, #77b634);
  box-shadow: inset 0px -1.5px 0px rgba(0,0,0,.4), inset 0px 1.5px 0px rgba(255,255,255,.2);
}

.question_result.wrong {
  background: linear-gradient(to bottom, #e23031, #c52d2f);
  box-shadow: inset 0px -1.5px 0px rgba(0,0,0,.4), inset 0px 1.5px 0px rgba(255,255,255,.2);
}

.round_result_avatar {
  display:flex;
  flex-direction: row;
  justify-content: flex-start;
  border-radius: 4px;
  padding: 1px;
} 

.round_result {
  background-color: #0f678f;
  border-radius: 8px; 
  grid-area: round_result;
  display:flex;
  flex-direction: row;
  align-self: start;
  justify-self: center;
  align-items: center;
  justify-content: center;
  padding: 2px 2px 2px 2px;
  margin-left: 10px;
  margin-right: 10px;
}

</style>
